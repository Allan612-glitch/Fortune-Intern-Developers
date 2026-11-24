from io import BytesIO
import unittest
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from PIL import Image
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from Backend.api.deps import get_current_user
from Backend.api.routes import admin, admin_reports, profiles, staff
from Backend.database import get_session
from Database.models import announcement, application, program, staff_invitation, user


class WorkspaceFeaturesTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            owner = user(name="Admin", email="owner@example.test", is_admin=True)
            student = user(name="Test Student", email="student@example.test")
            other = user(name="Other Student", email="other@example.test")
            listing = program(name="=Formula text", company="Fortune", status="open")
            another = program(name="Placement", company="Fortune", status="open")
            session.add_all([owner, student, other, listing, another])
            session.flush()
            record = application(user_id=student.id, program_id=listing.id, status="submitted")
            session.add(record)
            session.flush()
            self.owner = owner.id
            self.student = student.id
            self.other = other.id
            self.program_ids = [str(listing.id), str(another.id)]
            self.application = str(record.id)
            session.commit()

        def db():
            with Session(self.engine) as session:
                yield session

        def current_user():
            with Session(self.engine) as session:
                return session.get(user, self.actor)

        self.actor = self.owner
        app = FastAPI()
        for module in (admin, staff, admin_reports, profiles):
            app.include_router(module.router)
        app.dependency_overrides[get_current_user] = current_user
        app.dependency_overrides[get_session] = db
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def invite(self):
        response = self.client.post("/api/admin/staff/invitations", json={"email": "student@example.test", "role": "programs"})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["token"]

    def test_invite_is_single_use_and_permissions_follow_lifecycle(self):
        token = self.invite()
        with Session(self.engine) as session:
            self.assertEqual(len(session.exec(select(staff_invitation)).one().token_hash), 64)
            self.assertNotEqual(session.exec(select(staff_invitation)).one().token_hash, token)
        self.actor = self.other
        self.assertEqual(self.client.post("/api/staff/invitations/accept", json={"token": token}).status_code, 400)
        self.actor = self.student
        self.assertEqual(self.client.post("/api/staff/invitations/accept", json={"token": token}).status_code, 200)
        self.assertEqual(self.client.post("/api/staff/invitations/accept", json={"token": token}).status_code, 400)
        self.assertEqual(self.client.get("/api/admin/programs").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/applications").status_code, 403)
        self.assertEqual(self.client.get("/api/admin/staff").status_code, 403)
        self.actor = self.owner
        self.assertEqual(self.client.post("/api/admin/staff/bulk", json={
            "ids": [str(self.owner), str(self.student)], "action": "suspend",
        }).status_code, 409)
        for action, expected in (("suspend", 403), ("restore", 200), ("revoke", 403)):
            self.actor = self.owner
            self.assertEqual(self.client.post("/api/admin/staff/bulk", json={
                "ids": [str(self.student)], "action": action,
            }).status_code, 200)
            self.actor = self.student
            self.assertEqual(self.client.get("/api/admin/programs").status_code, expected)
        self.actor = self.owner
        staff_rows = self.client.get("/api/admin/staff").json()["accounts"]
        self.assertEqual(next(row["status"] for row in staff_rows if row["id"] == str(self.student)), "revoked")

    def test_program_bulk_unpublish_and_branded_report(self):
        invalid = self.client.post("/api/admin/programs/bulk-unpublish", json={"ids": [self.program_ids[0], str(uuid4())]})
        self.assertEqual(invalid.status_code, 404)
        self.assertTrue(all(row["status"] == "open" for row in self.client.get("/api/admin/programs").json()))
        updated = self.client.post("/api/admin/programs/bulk-unpublish", json={"ids": self.program_ids})
        self.assertEqual(updated.status_code, 200)
        self.assertTrue(all(row["status"] == "closed" for row in updated.json()))
        pdf = self.client.post("/api/admin/reports/programs", json={"ids": self.program_ids, "format": "pdf"})
        self.assertEqual(pdf.status_code, 200, pdf.text[:200])
        self.assertTrue(pdf.content.startswith(b"%PDF"))
        self.assertIn(b"/Subtype /Image", pdf.content)
        excel = self.client.post("/api/admin/reports/programs", json={"ids": self.program_ids, "format": "xlsx"})
        self.assertEqual(excel.status_code, 200)
        sheet = load_workbook(BytesIO(excel.content)).active
        self.assertEqual(sheet["A2"].value, "=Formula text")
        self.assertEqual(sheet["A2"].data_type, "s")

    def test_photo_is_normalized_and_available_to_application_review(self):
        self.actor = self.student
        invalid = self.client.put("/api/profile/photo", files={"file": ("fake.svg", b"<svg/>", "image/svg+xml")})
        self.assertEqual(invalid.status_code, 422)
        photo = BytesIO()
        Image.new("RGB", (800, 600), color="#F5B731").save(photo, format="PNG")
        response = self.client.put("/api/profile/photo", files={"file": ("photo.png", photo.getvalue(), "image/png")})
        self.assertEqual(response.status_code, 200, response.text[:200])
        image = response.json()["profile_picture"]
        self.assertTrue(image.startswith("data:image/jpeg;base64,"))
        self.assertEqual(self.client.get(f"/api/admin/applications/{self.application}/photo").status_code, 403)
        self.actor = self.owner
        self.assertEqual(self.client.get(f"/api/admin/applications/{self.application}/photo").json()["photo"], image)

    def test_each_table_reports_pdf_and_excel(self):
        self.invite()
        with Session(self.engine) as session:
            notice = announcement(title="Testing & updates", content="A notice with <text>.")
            session.add(notice)
            session.flush()
            notice_id = str(notice.id)
            invite_id = str(session.exec(select(staff_invitation)).one().id)
            session.commit()
        for table, ids in {
            "applications": [self.application], "users": [str(self.student)],
            "staff": [str(self.owner)], "invitations": [invite_id],
            "roles": [], "announcements": [notice_id],
        }.items():
            for format in ("pdf", "xlsx"):
                with self.subTest(table=table, format=format):
                    response = self.client.post(f"/api/admin/reports/{table}", json={"ids": ids, "format": format})
                    self.assertEqual(response.status_code, 200)
                    if format == "pdf":
                        self.assertIn(b"/Subtype /Image", response.content)
                    else:
                        self.assertGreaterEqual(load_workbook(BytesIO(response.content)).active.max_row, 2)

    def test_program_application_scope_and_totals(self):
        with Session(self.engine) as session:
            first = session.exec(select(program).where(program.name == "=Formula text")).one()
            next_program = session.exec(select(program).where(program.name == "Placement")).one()
            session.add_all([
                application(user_id=self.student, program_id=first.id, status="accepted"),
                application(user_id=self.other, program_id=first.id, status="shortlisted"),
                application(user_id=self.other, program_id=next_program.id, status="rejected"),
            ])
            session.commit()
        program_id = self.program_ids[0]
        summary_url = f"/api/admin/programs/{program_id}/application-summary"
        result = self.client.get(summary_url)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json(), {
            "total": 3, "applicant_accounts": 2,
            "statuses": {"accepted": 1, "shortlisted": 1, "submitted": 1},
        })
        scoped = self.client.get("/api/admin/applications", params={
            "program": program_id, "status": "Accepted", "limit": 1,
        })
        self.assertEqual(scoped.status_code, 200)
        self.assertEqual([(row["program_id"], row["status"]) for row in scoped.json()], [(program_id, "accepted")])
        self.actor = self.student
        self.assertEqual(self.client.get(summary_url).status_code, 403)
