from io import BytesIO
import unittest
from unittest.mock import patch

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from Backend.api.deps import get_current_user, get_optional_current_user
from Backend.api.routes import admin, announcements, audit
from Backend.core.audit import record_audit_event
from Backend.database import get_session
from Database.models import application, notification, program, user


class AuditInvestigationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(self.engine.dispose)
        SQLModel.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            owner = user(name="Investigator", email="owner@example.test", is_admin=True)
            first = user(name="First", email="first@example.test")
            second = user(name="Second", email="second@example.test")
            listing = program(name="Test program")
            session.add_all([owner, first, second, listing])
            session.flush()
            self.owner, self.first, self.second, self.program = owner.id, first.id, second.id, listing.id
            session.commit()

        def database():
            with Session(self.engine) as session:
                yield session

        def account():
            with Session(self.engine) as session:
                return session.get(user, self.actor) if self.actor else None

        self.actor = self.owner
        app = FastAPI()
        for module in (admin, announcements, audit):
            app.include_router(module.router)
        app.dependency_overrides[get_session] = database
        app.dependency_overrides[get_current_user] = account
        app.dependency_overrides[get_optional_current_user] = account
        self.client = TestClient(app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)

    def test_bulk_capture_branch_filters_export_and_permissions(self):
        response = self.client.post("/api/admin/programs/bulk-unpublish", json={"ids": [str(self.program)]})
        self.assertEqual(response.status_code, 200, response.text)
        result = self.client.get("/api/admin/audit", params={"module": "program", "limit": 1}).json()
        self.assertTrue(result["has_more"])
        child = result["events"][0]
        self.assertEqual(child["actor_name"], "Investigator")
        parent = self.client.get(f"/api/admin/audit/{child['parent_id']}").json()
        self.assertEqual(parent["event"]["details"]["context"]["processed"], 1)
        self.assertEqual([item["id"] for item in parent["related"]], [child["id"]])
        self.assertEqual(child["correlation_id"], parent["event"]["correlation_id"])
        for format in ("pdf", "xlsx", "json"):
            export = self.client.post("/api/admin/audit/export", json={"format": format, "filters": {"entity": str(self.program)}})
            self.assertEqual(export.status_code, 200, export.text[:300])
            if format == "pdf":
                self.assertIn(b"/Subtype /Image", export.content)
            elif format == "xlsx":
                self.assertEqual(load_workbook(BytesIO(export.content)).active.max_row, 2)
            else:
                self.assertEqual(export.json()["events"][0]["details"]["changes"]["status"], {"before": "open", "after": "closed"})
        exports = self.client.get("/api/admin/audit", params={"action": "audit.export"}).json()
        self.assertEqual(len(exports["events"]), 3)
        self.assertEqual(self.client.delete(f"/api/admin/audit/{child['id']}").status_code, 405)
        self.actor = self.first
        self.assertEqual(self.client.get("/api/admin/audit").status_code, 403)
        self.assertEqual(self.client.get("/api/admin/operations").status_code, 403)

    def test_audit_write_failure_rolls_back_business_action(self):
        with patch("Backend.api.routes.admin.record_audit_event", side_effect=RuntimeError("audit unavailable")):
            response = self.client.post("/api/admin/programs/bulk-unpublish", json={"ids": [str(self.program)]})
        self.assertEqual(response.status_code, 500)
        with Session(self.engine) as session:
            self.assertEqual(session.get(program, self.program).status, "open")

    def test_capture_redacts_unapproved_fields_and_does_not_guess_links(self):
        request = Request({"type": "http", "client": ("192.0.2.54", 80), "headers": []})
        with Session(self.engine) as session:
            event = record_audit_event(session, request, actor_id=self.owner, action="example",
                object_type="program", object_id=str(self.program),
                changes={"status": ("open", "closed"), "password": ("secret-one", "secret-two")},
                context={"token": "a-private-token"})
            event_id = event.id
            session.commit()
        info = self.client.get(f"/api/admin/audit/{event_id}").json()["event"]
        self.assertEqual(info["origin_network"], "192.0.2.0/24")
        self.assertNotIn("password", info["details"]["changes"])
        self.assertNotIn("token", info["details"]["context"])
        self.assertIsNone(info["parent_id"])

    @patch("Backend.api.routes.admin.send_announcement_emails")
    def test_private_notice_uses_explicit_recipient_for_visibility_and_email(self, send):
        response = self.client.post("/api/admin/announcements", json={
            "title": "Private test", "content": "Message", "category": "refund",
            "audience": "students", "student_ids": [str(self.first)],
        })
        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(send.call_args.kwargs["to_emails"], ["first@example.test"])
        self.assertEqual(len(self.client.get("/api/admin/announcements?category=refund").json()), 1)
        self.assertEqual(self.client.get("/api/admin/announcements?category=payments").json(), [])
        for account, visible in ((self.first, True), (self.second, False), (None, False)):
            self.actor = account
            self.assertEqual(bool(self.client.get("/api/announcements").json()), visible)
        with Session(self.engine) as session:
            self.assertEqual([row.user_id for row in session.exec(select(notification)).all()], [self.first])

    def test_failed_document_dispatch_has_retry_link_and_preserves_decision(self):
        with Session(self.engine) as session:
            record = application(user_id=self.first, program_id=self.program, status="submitted")
            session.add(record)
            session.flush()
            app_id = str(record.id)
            session.commit()
        url = f"/api/admin/applications/{app_id}/status"
        with (
            patch("Backend.api.routes.admin.documents.build_recommendation_letter_pdf", return_value=b"letter"),
            patch("Backend.api.routes.admin.documents.build_assessment_form_pdf", return_value=b"assessment"),
            patch("Backend.api.routes.admin.send_application_documents_email", side_effect=[RuntimeError("offline"), None]),
            self.assertLogs("Backend.api.routes.admin", level="ERROR"),
        ):
            self.assertEqual(self.client.put(url, json={"status": "accepted", "reason": "placement_confirmed"}).status_code, 503)
            self.assertEqual(self.client.put(url, json={"status": "accepted"}).status_code, 200)
        events = self.client.get("/api/admin/audit", params={"workflow": app_id}).json()["events"]
        retry, failure, decision = events
        self.assertEqual(retry["outcome"], "success")
        self.assertEqual(retry["retry_of_id"], failure["id"])
        self.assertEqual(failure["parent_id"], decision["id"])
        evidence = self.client.get(f"/api/admin/audit/{decision['id']}").json()["event"]
        self.assertEqual(evidence["details"]["context"]["reason"], "placement_confirmed")
