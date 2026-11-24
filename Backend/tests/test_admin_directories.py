from datetime import datetime, timedelta, timezone
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from Backend.api.routes import admin
from Database.models import announcement, application, audit_event, notification, program, user


class TestAdminDirectories(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        self.addCleanup(self.engine.dispose)
        SQLModel.metadata.create_all(self.engine)
        now = datetime.now(timezone.utc)
        older = now - timedelta(days=1)
        with Session(self.engine) as session:
            staff = user(name="Staff", email="staff@example.test", is_admin=True)
            student = user(
                name="Earlier % Student", email="earlier@example.test",
                is_suspended=True, created_at=older,
            )
            current_program = program(name="Searchable program")
            session.add_all([
                staff, student, current_program,
                program(name="Expired", deadline=older),
                program(name="Closed cycle", cycle_closed_at=older),
                program(name="Closed", status="closed"),
                announcement(title="News", content="Update"),
            ])
            session.add_all([
                user(name=f"Student {index}", email=f"user{index}@example.test")
                for index in range(101)
            ])
            session.flush()
            earlier_application = application(
                user_id=student.id, program_id=current_program.id,
                applicant_name="Earlier % Applicant", created_at=older,
                status="under_review", student_index_number="EARLIER-10",
                letter_reference="FIN/2026/TEST-0001",
            )
            session.add(earlier_application)
            session.add_all([
                application(
                    user_id=staff.id, program_id=current_program.id,
                    applicant_name=f"Applicant {index}", status="submitted",
                )
                for index in range(101)
            ])
            session.flush()
            self.admin_id = staff.id
            self.student_id = str(student.id)
            self.application_id = str(earlier_application.id)
            session.commit()

        def get_session():
            with Session(self.engine) as session:
                yield session

        def get_admin():
            with Session(self.engine) as session:
                return session.get(user, self.admin_id)

        app = FastAPI()
        app.include_router(admin.router)
        app.dependency_overrides[admin.get_session] = get_session
        for dependency in (admin.get_current_admin, admin.workspace_users, admin.workspace_applications):
            app.dependency_overrides[dependency] = get_admin
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def get(self, section, **params):
        response = self.client.get(f"/api/admin/{section}", params=params)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_overview_counts_all_records_and_only_open_programs(self):
        self.assertEqual(self.get("overview"), {
            "awaiting_review": 102, "open_programs": 1, "users": 103, "students": 102, "announcements": 1,
        })

    def test_user_search_and_status_apply_before_pagination(self):
        self.assertNotIn(self.student_id, [row["id"] for row in self.get("users")])
        rows = self.get("users", q="EARLIER %", status="suspended", limit=1)
        self.assertEqual([row["id"] for row in rows], [self.student_id])
        self.assertEqual(self.get("users", q="%", status="active"), [])
        self.assertEqual(self.get("users", q="%", offset=1), [])

    def test_account_role_filters_apply_before_pagination(self):
        admins = self.get("users", role="admin", limit=1)
        self.assertEqual([row["id"] for row in admins], [str(self.admin_id)])
        self.assertEqual(self.get("users", role="admin", status="suspended"), [])
        self.assertEqual(self.get("users", role="student", q="staff@example.test"), [])
        students = self.get("users", role="student", status="suspended", limit=1)
        self.assertEqual([row["id"] for row in students], [self.student_id])

    def test_application_search_and_user_scope_apply_before_pagination(self):
        self.assertNotIn(self.application_id, [row["id"] for row in self.get("applications")])
        for query in ("earlier %", "earlier-10", "fin/2026/test-0001", self.application_id):
            with self.subTest(query=query):
                rows = self.get("applications", q=query, status="queue", limit=1)
                self.assertEqual([row["id"] for row in rows], [self.application_id])
        rows = self.get("applications", q="SEARCHABLE PROGRAM", user=self.student_id, limit=1)
        self.assertEqual([row["id"] for row in rows], [self.application_id])
        self.assertEqual(self.get("applications", user=self.student_id, status="Submitted"), [])
        self.assertEqual(self.get("applications", user=self.student_id, offset=1), [])

        first = self.get("applications", limit=25)
        second = self.get("applications", limit=25, offset=25)
        self.assertEqual(len(first), len(second))
        self.assertFalse({row["id"] for row in first} & {row["id"] for row in second})

    def test_review_queue_assigns_tracks_overdue_and_notifies_once(self):
        uri = f"/api/admin/applications/{self.application_id}/review"
        response = self.client.patch(uri, json={"reviewer_id": self.student_id})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.get("applications/reviewers"), [{"id": str(self.admin_id), "name": "Staff"}])
        payload = {"reviewer_id": str(self.admin_id), "review_due_date": "2020-01-01",
                   "document_request": "Please attach your enrolment letter."}
        for _ in range(2):
            response = self.client.patch(uri, json=payload)
            self.assertEqual(response.status_code, 200, response.text)
        for queue in ("mine", "overdue", "awaiting_documents"):
            rows = self.get("applications", review=queue, limit=1)
            self.assertEqual([row["id"] for row in rows], [self.application_id])
            self.assertEqual(rows[0]["reviewer_name"], "Staff")
            self.assertEqual(self.get("applications/review-counts")[queue], 1)
        with Session(self.engine) as session:
            notice = session.exec(select(notification)).one()
            self.assertEqual(str(notice.user_id), self.student_id)
            self.assertIn(payload["document_request"], notice.message)
            evidence = session.exec(select(audit_event).where(audit_event.action == "application.review.update")).one()
            self.assertNotIn(payload["document_request"], str(evidence.details))
        response = self.client.patch(uri, json={"document_request": None})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.get("applications", review="awaiting_documents"), [])
        self.assertEqual(self.get("applications", review="mine")[0]["review_due_date"], "2020-01-01")

    def test_bulk_suspension_is_atomic_and_protects_admins(self):
        with Session(self.engine) as session:
            first = str(session.exec(select(user).where(user.email == "user0@example.test")).one().id)
            second = str(session.exec(select(user).where(user.email == "user1@example.test")).one().id)
        endpoint = "/api/admin/users/bulk-suspension"
        response = self.client.put(endpoint, json={"user_ids": [first, str(self.admin_id)], "suspended": True})
        self.assertEqual(response.status_code, 403)
        response = self.client.put(endpoint, json={"user_ids": [first, "6d687bf3-d6ce-4db0-94dc-0578f3fbfb53"], "suspended": True})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.get("users", q="user0@example.test", status="suspended"), [])

        ids = [first, second]
        for suspended in (True, True, False):
            response = self.client.put(endpoint, json={"user_ids": ids, "suspended": suspended})
            self.assertEqual(response.status_code, 200)
            self.assertEqual({row["id"] for row in response.json()}, set(ids))
            self.assertTrue(all(row["is_suspended"] == suspended for row in response.json()))
        with Session(self.engine) as session:
            events = session.exec(select(audit_event).where(audit_event.action == "user.suspension.update")).all()
            self.assertCountEqual([event.object_id for event in events], ids + ids)
