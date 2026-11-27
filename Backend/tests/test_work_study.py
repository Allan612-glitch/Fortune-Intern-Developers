import asyncio
import io
import importlib.util
import unittest
from datetime import date, datetime, timezone
from pathlib import Path
from unittest.mock import patch
from uuid import UUID
from zipfile import ZipFile

from fastapi import UploadFile
from fastapi.testclient import TestClient
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import inspect, text
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from Backend.api.deps import get_current_user
from Backend.database import get_session
from Backend.core.account_deletion import purge_account
from Backend.core.uploads import read_validated_document
from Backend.main import create_app
from Database.models import program, user, work_study_registration


class TestWorkStudyAndResumeEndpoints(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        SQLModel.metadata.create_all(self.engine)
        self.student = user(name="Test Student", email="student@example.test")
        self.other = user(name="Other Student", email="other@example.test")
        self.admin = user(name="Test Admin", email="admin@example.test", is_admin=True)
        self.program = program(name="Test internship")
        with Session(self.engine, expire_on_commit=False) as session:
            session.add_all([self.student, self.other, self.admin, self.program])
            session.commit()
        self.actor = self.student
        self.app = create_app()

        def override_session():
            with Session(self.engine, expire_on_commit=False) as session:
                yield session

        self.app.dependency_overrides[get_session] = override_session
        self.app.dependency_overrides[get_current_user] = lambda: self.actor
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def registration(self):
        return {
            "applicant_name": "Test Student",
            "date_of_birth": "2000-01-01",
            "phone": "+233 20 000 0000",
            "institution": "Test University",
            "chapter": "Accra",
            "preferred_role": "tutoring",
            "availability": "evenings",
            "weekly_hours": "4-6",
            "consent": True,
        }

    def test_registration_requires_authentication_and_consent(self):
        self.app.dependency_overrides.pop(get_current_user)
        self.assertEqual(self.client.post("/api/work-study", json=self.registration()).status_code, 401)
        self.app.dependency_overrides[get_current_user] = lambda: self.actor
        for changes in ({"consent": False}, {"institution": "  "}, {"preferred_role": "unknown"}, {"date_of_birth": "2018-01-01"}):
            payload = {**self.registration(), **changes}
            self.assertIn(self.client.post("/api/work-study", json=payload).status_code, (403, 422))
        self.assertEqual(self.client.get("/api/work-study/mine").json(), [])

    def test_registration_is_persisted_private_and_admin_visible(self):
        created = self.client.post("/api/work-study", json=self.registration())
        self.assertEqual(created.status_code, 201, created.text)
        record = created.json()
        self.assertEqual(record["email"], self.student.email)
        self.assertTrue(record["consented_at"])
        self.assertEqual(self.client.get("/api/work-study/mine").json()[0]["id"], record["id"])
        self.assertEqual(self.client.get("/api/work-study").status_code, 403)
        self.actor = self.other
        self.assertEqual(self.client.get("/api/work-study/mine").json(), [])
        self.actor = self.admin
        self.assertEqual(self.client.get("/api/work-study").json()[0]["id"], record["id"])

    def test_minor_flag_and_account_deletion(self):
        age_17 = date(datetime.now(timezone.utc).year - 17, 1, 1)
        response = self.client.post("/api/work-study", json={**self.registration(), "date_of_birth": age_17.isoformat()})
        self.assertEqual(response.status_code, 201, response.text)
        self.assertTrue(response.json()["requires_minor_review"])
        with Session(self.engine) as session:
            purge_account(session, session.get(user, self.student.id))
            self.assertEqual(session.exec(select(work_study_registration)).all(), [])

    def test_registration_pages_have_stable_order_for_matching_timestamps(self):
        timestamp = datetime(2026, 1, 1, tzinfo=timezone.utc)
        with Session(self.engine) as session:
            for value in (1, 2, 3):
                session.add(work_study_registration(
                    id=UUID(int=value), user_id=self.student.id, applicant_name="Test Student",
                    email=self.student.email, date_of_birth=date(2000, 1, 1), phone="0200000000",
                    institution="Test University", chapter="Accra", preferred_role="tutoring",
                    availability="evenings", weekly_hours="4-6", consented_at=timestamp, created_at=timestamp,
                ))
            session.commit()
        for path, actor in (("/api/work-study/mine", self.student), ("/api/work-study", self.admin)):
            self.actor = actor
            first = self.client.get(path, params={"limit": 2, "offset": 0})
            second = self.client.get(path, params={"limit": 2, "offset": 2})
            self.assertEqual(first.status_code, 200, first.text)
            self.assertEqual(second.status_code, 200, second.text)
            self.assertEqual([row["id"] for row in first.json() + second.json()], [str(UUID(int=n)) for n in (3, 2, 1)])

    def test_application_resume_pdf_restrictions(self):
        data = {"program_id": str(self.program.id), "date_of_birth": "2000-01-01"}
        docx = io.BytesIO()
        with ZipFile(docx, "w") as archive:
            archive.writestr("word/document.xml", "<document/>")
        cases = [
            ("resume.docx", docx.getvalue(), 422),
            ("fake.pdf", b"not a pdf", 422),
            ("empty.pdf", b"", 422),
            ("large.pdf", b"%PDF-" + b"x" * (5 * 1024 * 1024 - 4), 413),
        ]
        for filename, content, expected in cases:
            with self.subTest(filename=filename):
                response = self.client.post("/api/applications", data=data, files={"resume": (filename, content, "application/pdf")})
                self.assertEqual(response.status_code, expected, response.text)
        content = b"%PDF-" + b"x" * (5 * 1024 * 1024 - 5)
        with patch("Backend.api.routes.applications.storage.upload_resume"), patch("Backend.api.routes.applications.send_application_received_email"):
            response = self.client.post("/api/applications", data=data, files={"resume": ("valid.pdf", content, "application/pdf")})
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["resume_filename"], "valid.pdf")

    def test_personal_applications_are_saved_without_a_catalog_program(self):
        payload = {
            "personal_internship": True, "companyName": "Example Company",
            "companyAddress": "Accra", "date_of_birth": "2000-01-01",
            "applicant_name": self.student.name, "student_index_number": "1234567",
        }
        with patch("Backend.api.routes.applications.send_application_received_email"):
            first = self.client.post("/api/applications", json=payload)
            duplicate = self.client.post("/api/applications", json={**payload, "companyName": " example company "})
            another = self.client.post("/api/applications", files={
                key: (None, str(value)) for key, value in
                {**payload, "personal_internship": "true", "companyName": "Another Company"}.items()
            })
        self.assertEqual(first.status_code, 201, first.text)
        self.assertIsNone(first.json()["program_id"])
        self.assertEqual(first.json()["program_name"], "Personal internship")
        self.assertEqual(first.json()["host_company_name"], "Example Company")
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(another.status_code, 201, another.text)
        self.assertEqual(self.client.post("/api/applications", json={**payload, "companyName": " "}).status_code, 422)
        self.assertEqual(self.client.post("/api/applications", json={**payload, "program_id": str(self.program.id)}).status_code, 422)
        self.assertEqual(len(self.client.get("/api/applications").json()), 2)
        with Session(self.engine) as session:
            self.assertEqual(len(session.exec(select(program)).all()), 1)
        self.actor = self.other
        self.assertEqual(self.client.get("/api/applications").json(), [])
        self.actor = self.admin
        results = self.client.get("/api/admin/applications", params={"q": "Example Company"})
        self.assertEqual(results.status_code, 200, results.text)
        self.assertIsNone(results.json()[0]["program_id"])
        with patch("Backend.api.routes.admin.send_application_documents_email"):
            accepted = self.client.put(f"/api/admin/applications/{first.json()['id']}/status",
                                       json={"status": "accepted", "reason": "eligibility_confirmed"})
        self.assertEqual(accepted.status_code, 200, accepted.text)
        self.assertIsNone(accepted.json()["program_id"])
        self.actor = self.student
        self.assertEqual(self.client.get(f"/api/applications/{first.json()['id']}").json()["program_name"], "Personal internship")
        self.assertEqual(self.client.get("/api/dashboard").status_code, 200)

    def test_personal_application_migration_preserves_existing_rows(self):
        path = Path(__file__).resolve().parents[2] / "Database" / "Database" / "migrations" / "versions" / "c2a8e4f6b307_personal_internship_applications.py"
        spec = importlib.util.spec_from_file_location("personal_application_migration", path)
        if spec is None or spec.loader is None:
            raise RuntimeError("Unable to load personal application migration")
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE applications (id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, program_id CHAR(32) NOT NULL, status TEXT NOT NULL, host_company_name TEXT, applicant_name TEXT, student_index_number TEXT)"))
            connection.execute(text("INSERT INTO applications (id, user_id, program_id, status) VALUES (1, 'user', 'program', 'submitted')"))
            with Operations.context(MigrationContext.configure(connection)):
                migration.upgrade()
            self.assertTrue(next(col for col in inspect(connection).get_columns("applications") if col["name"] == "program_id")["nullable"])
            connection.execute(text("INSERT INTO applications (id, user_id, program_id, status, host_company_name) VALUES (2, 'user', NULL, 'submitted', 'Company')"))
            with Operations.context(MigrationContext.configure(connection)):
                with self.assertRaisesRegex(RuntimeError, "personal internship"):
                    migration.downgrade()
            connection.execute(text("DELETE FROM applications WHERE id = 2"))
            with Operations.context(MigrationContext.configure(connection)):
                migration.downgrade()
            self.assertEqual(connection.execute(text("SELECT program_id FROM applications WHERE id = 1")).scalar(), "program")
            self.assertFalse(next(col for col in inspect(connection).get_columns("applications") if col["name"] == "program_id")["nullable"])
        engine.dispose()

    def test_other_document_uploads_keep_existing_docx_support(self):
        data = io.BytesIO()
        with ZipFile(data, "w") as archive:
            archive.writestr("word/document.xml", "<document/>")
        upload = UploadFile(file=io.BytesIO(data.getvalue()), filename="document.docx")
        _, filename, _ = asyncio.run(read_validated_document(upload, "Document"))
        self.assertEqual(filename, "document.docx")

    def test_work_study_migration_creates_and_removes_table(self):
        path = Path(__file__).resolve().parents[2] / "Database" / "Database" / "migrations" / "versions" / "b1f7e4c9d205_create_work_study_registrations.py"
        spec = importlib.util.spec_from_file_location("work_study_migration", path)
        if spec is None or spec.loader is None:
            raise RuntimeError("Unable to load work-study migration")
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            user.__table__.create(connection)
            with Operations.context(MigrationContext.configure(connection)):
                migration.upgrade()
                self.assertIn("work_study_registrations", inspect(connection).get_table_names())
                self.assertEqual(inspect(connection).get_foreign_keys("work_study_registrations")[0]["options"]["ondelete"], "CASCADE")
                migration.downgrade()
                self.assertNotIn("work_study_registrations", inspect(connection).get_table_names())
        engine.dispose()
