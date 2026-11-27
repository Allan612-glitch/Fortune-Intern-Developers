import io
import json
import unittest
from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from Backend.api.deps import get_current_user
from Backend.api.routes.finance import verify_provider
from Backend.core.config import settings
from Backend.database import get_session
from Backend.main import create_app
from Database.admin_records import FinanceRecord
from Database.models import application, program, user


class AdminWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine)
        self.admin = user(name="QA Administrator", email="qa-admin@example.test", is_admin=True)
        self.student = user(name="QA Student", email="qa-student@example.test")
        self.other = user(name="QA Other", email="qa-other@example.test")
        with Session(self.engine, expire_on_commit=False) as session:
            session.add_all([self.admin, self.student, self.other])
            session.commit()
        self.actor = self.admin.id
        app = create_app()

        def session_override():
            with Session(self.engine, expire_on_commit=False) as session:
                yield session

        def account_override():
            with Session(self.engine, expire_on_commit=False) as session:
                yield session.get(user, self.actor)

        app.dependency_overrides[get_session] = session_override
        app.dependency_overrides[get_current_user] = account_override
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.addCleanup(self.engine.dispose)

    def finance_record(self, kind="expense"):
        response = self.client.post("/api/admin/finance", json={
            "kind": kind, "account_id": str(self.student.id), "description": "QA sample",
            "category": "Operations", "amount_minor": 1250, "record_date": "2025-01-15",
        })
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_public_program_pages_keep_matching_timestamps_in_stable_order(self):
        timestamp = datetime(2026, 1, 1, tzinfo=timezone.utc)
        with Session(self.engine) as session:
            session.add_all([program(id=UUID(int=value), name=f"Test program {value}", created_at=timestamp)
                             for value in (1, 2, 3)])
            session.commit()
        first = self.client.get("/api/programs", params={"limit": 2, "offset": 0})
        second = self.client.get("/api/programs", params={"limit": 2, "offset": 2})
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual([row["id"] for row in first.json() + second.json()], [str(UUID(int=n)) for n in (3, 2, 1)])

    def test_student_opportunity_profile_and_drafts(self):
        deadline = datetime.now(timezone.utc) + timedelta(days=2)
        payload = {"name": "Remote QA internship", "company": "QA Employer", "deadline": deadline.isoformat(),
                   "opportunity": {"employer_verified": True, "work_mode": "remote", "compensation": "paid",
                                   "eligible_courses": ["Computer Science"], "eligible_years": [2],
                                   "response_by": (deadline + timedelta(days=1)).date().isoformat()}}
        created = self.client.post("/api/admin/programs", json=payload)
        self.assertEqual(created.status_code, 201, created.text)
        program_id = created.json()["id"]
        route = "/api/student/opportunities/" + program_id
        self.actor = self.student.id
        public = self.client.get("/api/programs/" + program_id).json()
        self.assertTrue(public["opportunity"]["employer_verified"])
        self.assertEqual(public["application_fee_minor"], 400)
        self.assertEqual(self.client.put("/api/admin/programs/" + program_id, json=payload).status_code, 403)
        profile = self.client.put("/api/profile", json={"career": {"location": "Accra", "work_mode": "remote", "portfolio_url": "https://example.org/"}})
        self.assertEqual(profile.status_code, 200, profile.text)
        self.assertEqual(self.client.get("/api/profile").json()["career"]["location"], "Accra")
        self.assertEqual(self.client.put("/api/profile", json={"career": {"portfolio_url": "javascript:alert(1)"}}).status_code, 422)
        self.assertEqual(self.client.patch(route, json={"remind": True}).status_code, 422)
        saved = self.client.patch(route, json={"saved": True, "remind": True, "draft": {"program": "Computer Science"}})
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertTrue(self.client.get("/api/student/opportunities").json()[0]["has_draft"])
        self.assertIn("Application deadline", self.client.get("/api/student/actions").json()[0]["title"])
        self.assertEqual(self.client.patch(route, json={"draft": {"dateOfBirth": "2005-01-01"}}).status_code, 422)
        self.actor = self.other.id
        self.assertEqual(self.client.get(route).json(), {"draft": None, "saved": False, "remind": False})
        self.assertEqual(self.client.get("/api/student/opportunities").json(), [])
        self.actor = self.student.id
        removed = self.client.patch(route, json={"saved": False, "draft": None})
        self.assertEqual(removed.status_code, 200, removed.text)
        self.assertFalse(removed.json()["remind"])
        self.assertEqual(self.client.get("/api/student/opportunities").json(), [])
        self.actor = self.admin.id
        changed = self.client.put("/api/admin/programs/" + program_id,
                                  json={"name": payload["name"], "company": "Different employer", "deadline": payload["deadline"]})
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertFalse(changed.json()["opportunity"]["employer_verified"])

    def test_student_next_steps_and_owned_placement_acceptance(self):
        yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
        with Session(self.engine, expire_on_commit=False) as session:
            intake = program(name="Student updates QA", opportunity={"response_by": yesterday})
            session.add(intake)
            session.flush()
            pending = application(user_id=self.student.id, program_id=intake.id, status="submitted")
            offered = application(user_id=self.student.id, program_id=intake.id, status="accepted", letter_reference="FIN-QA-LETTER")
            session.add_all([pending, offered])
            session.commit()
        review_path = f"/api/admin/applications/{pending.id}/review"
        response = self.client.patch(review_path, json={
            "document_request": "Provide the institution letter",
            "student_update": {"message": "Meet the interviewer at reception at 9 am", "kind": "interview", "due": yesterday}})
        self.assertEqual(response.status_code, 200, response.text)
        base = "/api/admin/placements"
        employer = self.client.post(base + "/employers", json={"name": "QA Employer"}).json()
        opening = self.client.post(base + "/openings", json={"title": "Student role", "employer_id": employer["id"],
                                  "program_id": str(intake.id), "capacity": 1}).json()
        assigned = self.client.post(base, json={"opening_id": opening["id"], "application_id": str(offered.id)})
        self.assertEqual(assigned.status_code, 201, assigned.text)
        assignment = assigned.json()["id"]
        path = f"/api/student/placements/{assignment}/accept"
        self.actor = self.student.id
        detail = self.client.get(f"/api/applications/{pending.id}").json()
        self.assertEqual(detail["student_update"]["kind"], "interview")
        self.assertEqual(detail["response_by"], yesterday)
        self.assertIn("institution letter", detail["document_request"])
        self.assertNotIn("review_due_date", detail)
        self.assertEqual(len(self.client.get("/api/student/actions").json()), 3)
        self.assertEqual(self.client.get("/api/student/placements").json(), [])
        self.assertEqual(self.client.post(path).status_code, 404)
        self.actor = self.admin.id
        self.assertEqual(self.client.patch(base + "/" + assignment, json={"status": "employer_confirmed"}).status_code, 200)
        self.actor = self.other.id
        self.assertEqual(self.client.post(path).status_code, 404)
        self.assertEqual(self.client.get(f"/api/applications/{pending.id}").status_code, 404)
        self.actor = self.student.id
        self.assertEqual(self.client.post(path).json()["status"], "student_accepted")
        self.assertEqual(self.client.post(path).status_code, 200)
        placements = self.client.get("/api/student/placements").json()
        self.assertEqual(placements[0]["status"], "student_accepted")
        self.assertTrue(placements[0]["placement_files_available"])
        doc = f"/api/applications/{offered.id}/placement-document/recommendation"
        self.assertTrue(self.client.get(doc).content.startswith(b"%PDF"))
        self.assertEqual(self.client.get("/api/admin/opportunity-outcomes").status_code, 403)
        self.actor = self.other.id
        self.assertEqual(self.client.get(doc).status_code, 404)
        self.actor = self.admin.id
        metrics = self.client.get("/api/admin/opportunity-outcomes")
        self.assertEqual(metrics.status_code, 200, metrics.text)
        self.assertEqual(metrics.json()["placed"], 1)



    def test_placement_workflow_capacity_and_authorization(self):
        with Session(self.engine, expire_on_commit=False) as session:
            intake = program(name="Placement test intake")
            session.add(intake)
            session.flush()
            apps = [application(user_id=account.id, program_id=intake.id, status="accepted")
                    for account in (self.student, self.other)]
            session.add_all(apps)
            session.commit()
        base = "/api/admin/placements"
        employer = self.client.post(base + "/employers", json={"name": "QA Employer"})
        self.assertEqual(employer.status_code, 201, employer.text)
        opened = self.client.post(base + "/openings", json={
            "title": "QA Opening", "program_id": str(intake.id), "capacity": 1,
            "employer_id": employer.json()["id"],
        })
        self.assertEqual(opened.status_code, 201, opened.text)
        opening = opened.json()["id"]
        candidates = self.client.get(base + "/candidates", params={"opening_id": opening})
        self.assertEqual(len(candidates.json()), 2)
        assigned = self.client.post(base, json={"opening_id": opening, "application_id": str(apps[0].id)})
        self.assertEqual(assigned.status_code, 201, assigned.text)
        full = self.client.post(base, json={"opening_id": opening, "application_id": str(apps[1].id)})
        self.assertEqual(full.status_code, 409)
        path = base + "/" + assigned.json()["id"]
        self.assertEqual(self.client.patch(path, json={"status": "completed"}).status_code, 409)
        for status in ("employer_confirmed", "student_accepted", "started", "completed"):
            updated = self.client.patch(path, json={"status": status, "start_date": "2026-01-01",
                                                    "end_date": "2026-02-01", "feedback": "Completed tasks"})
            self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(self.client.get(base + "/catalog").json()["openings"][0]["available"], 0)
        self.assertEqual(self.client.get(base, params={"stage": "completed"}).json()["items"][0]["feedback"], "Completed tasks")
        self.actor = self.student.id
        self.assertEqual(self.client.get(base).status_code, 403)

    def test_reconciliation_matches_and_records_a_processed_refund_once(self):
        invoice = self.client.post("/api/admin/finance", json={
            "kind": "invoice", "account_id": str(self.student.id), "description": "Application fee",
            "category": "Fees", "amount_minor": 400, "record_date": "2025-01-15",
        }).json()
        with patch("Backend.api.routes.finance.verify_provider", return_value=(date(2025, 1, 15), False)):
            self.actor = self.student.id
            self.assertEqual(self.client.post("/api/finance/verify", json={"reference": "QA-FOR-MATCH"}).status_code, 200)
        self.actor = self.admin.id
        base = "/api/admin/finance/reconciliation"
        match = self.client.put(f"{base}/invoices/{invoice['id']}", json={"reference": "QA-FOR-MATCH"})
        self.assertEqual(match.status_code, 200, match.text)
        self.assertEqual(self.client.get(base).json()["unmatched_payments"], [])
        transaction = {"data": {"id": 100, "domain": "live", "amount": 400, "currency": "GHS", "reference": "QA-FOR-MATCH"}}
        processed = {"data": {"id": 11, "transaction": 100, "domain": "live", "status": "processed", "amount": 150,
                              "currency": "GHS", "refunded_at": "2025-01-27T14:15:00Z"}}
        with patch("Backend.api.routes.reconciliation.paystack", side_effect=[(transaction, False), (processed, False)] * 2):
            for _ in range(2):
                result = self.client.post(base + "/refunds", json={"reference": "QA-FOR-MATCH", "refund_id": "11"})
                self.assertEqual(result.status_code, 200, result.text)
        summary = self.client.get("/api/admin/finance/summary", params={"month": "2025-01"}).json()
        self.assertEqual((summary["revenue"], summary["refunds"], summary["net"]), (400, 150, 250))
        self.assertEqual(len(self.client.get(base).json()["refunds"]), 1)
        provider_page = {"data": [
            {"reference": "QA-FOR-MATCH", "amount": 400, "currency": "GHS", "status": "success"},
            {"reference": "QA-MISSING", "amount": 400, "currency": "GHS", "status": "success"},
        ], "meta": {"pageCount": 2}}
        with patch("Backend.api.routes.reconciliation.paystack", return_value=(provider_page, False)):
            statement = self.client.get(base + "/settlement", params={"settlement_id": "99"}).json()
        self.assertTrue(statement["has_next"])
        self.assertEqual([item["result"] for item in statement["items"]], ["matched", "missing_receipt"])

    def test_followup_retry_reuses_provider_key_and_student_cannot_read_history(self):
        with Session(self.engine, expire_on_commit=False) as session:
            intake = program(name="Mail intake")
            session.add(intake)
            session.flush()
            record = application(user_id=self.student.id, program_id=intake.id, status="review",
                                 document_request="Please attach student proof")
            session.add(record)
            session.commit()
        path = f"/api/admin/applications/{record.id}/messages"
        message_id = str(uuid4())
        body = {"id": message_id, "template": "document_reminder"}
        with patch.object(settings, "resend_api_key", "qa-key"), patch.object(settings, "resend_from_email", "qa@example.test"), patch(
                "Backend.api.routes.followups.resend.Emails.send", side_effect=[RuntimeError("provider offline"), {"id": "qa-provider-id"}]) as send:
            first = self.client.post(path, json=body)
            self.assertEqual(first.status_code, 200, first.text)
            self.assertEqual(first.json()["status"], "failed")
            self.assertEqual(self.client.post(path, json=body).json()["attempts"], 1)
            self.assertEqual(self.client.get("/api/admin/applications", params={"review": "failed_followups"}).json()[0]["id"], str(record.id))
            retried = self.client.post(path + f"/{message_id}/retry")
            self.assertEqual(retried.status_code, 200, retried.text)
            self.assertEqual(retried.json()["status"], "accepted")
            self.assertEqual(send.call_args_list[0].args[1], send.call_args_list[1].args[1])
            self.assertEqual(send.call_args_list[0].args[0]["to"], [self.student.email])
        self.assertEqual(self.client.get("/api/admin/applications", params={"review": "failed_followups"}).json(), [])
        self.actor = self.student.id
        self.assertEqual(self.client.get(path).status_code, 403)

    def test_ticket_due_date_and_resolution_keep_internal_notes_private(self):
        self.actor = self.student.id
        ticket = self.client.post("/api/support", json={"title": "Question about placement", "description": "Help please", "category": "general"}).json()
        self.actor = self.admin.id
        path = "/api/admin/support/update"
        common = {"ids": [ticket["id"]], "note": "Staff-only information"}
        self.assertEqual(self.client.post(path, json={**common, "status": "in_progress", "due_date": "2025-01-10"}).status_code, 200)
        self.assertEqual(self.client.get("/api/admin/support", params={"overdue": True}).json()["total"], 1)
        self.assertEqual(self.client.post(path, json={**common, "status": "closed", "resolution": "Your issue has been resolved."}).status_code, 200)
        self.actor = self.student.id
        own = self.client.get("/api/support").json()
        self.assertEqual(own[0]["resolution"], "Your issue has been resolved.")
        self.assertNotIn("Staff-only information", str(own))

    def test_finance_totals_and_private_documents(self):
        expense = self.finance_record()
        invoice = self.finance_record("invoice")
        with patch("Backend.api.routes.finance.verify_provider", side_effect=[(date(2025, 1, 15), False), (date(2025, 1, 15), True)]) as verify:
            self.actor = self.student.id
            payload = {"reference": "QA-LIVE-REFERENCE"}
            first = self.client.post("/api/finance/verify", json=payload)
            again = self.client.post("/api/finance/verify", json=payload)
            test = self.client.post("/api/finance/verify", json={"reference": "QA-TEST-REFERENCE"})
            self.assertEqual(first.status_code, 200, first.text)
            self.assertEqual(first.json(), again.json())
            self.assertEqual(verify.call_count, 2)
            self.assertTrue(test.json()["test_mode"])
            self.assertEqual(self.client.get("/api/finance/documents").json()["total"], 3)
            self.assertEqual(self.client.get(f"/api/finance/documents/{expense['id']}").status_code, 404)
            self.assertEqual(self.client.get(f"/api/finance/documents/{invoice['id']}").status_code, 200)
            self.actor = self.other.id
            self.assertEqual(self.client.post("/api/finance/verify", json=payload).status_code, 409)
            self.assertEqual(self.client.get(f"/api/finance/documents/{invoice['id']}").status_code, 404)
            self.assertEqual(self.client.get("/api/admin/finance?kind=expense").status_code, 403)
        self.actor = self.admin.id
        report = self.client.get("/api/admin/finance/summary?month=2025-01")
        self.assertEqual({key: report.json()[key] for key in ("payments", "revenue", "expenses", "net")},
                         {"payments": 1, "revenue": 400, "expenses": 1250, "net": -850})
        self.assertEqual(self.client.get("/api/admin/finance").json()["total"], 1)
        self.assertEqual(self.client.get("/api/admin/finance?include_test=true").json()["total"], 2)
        for format, prefix in (("pdf", b"%PDF-"), ("xlsx", b"PK")):
            report = self.client.post("/api/admin/finance/export", json={"ids": [expense["id"], invoice["id"]], "format": format})
            self.assertTrue(report.content.startswith(prefix))

    def test_itemised_invoice_validates_totals_and_includes_payment_terms_pages(self):
        payload = {
            "kind": "invoice", "account_id": str(self.student.id), "description": "Pilot intake",
            "category": "Fees", "amount_minor": 12750, "record_date": "2026-01-10", "due_date": "2026-01-31",
            "external_reference": "QA-1124",
            "line_items": [
                {"description": "Processing", "quantity": 2, "unit_amount_minor": 5000},
                {"description": "Administration", "quantity": 1, "unit_amount_minor": 2750},
            ],
        }
        self.assertEqual(self.client.post("/api/admin/finance", json={**payload, "amount_minor": 12749}).status_code, 422)
        self.assertEqual(self.client.post("/api/admin/finance", json={**payload, "due_date": "2026-01-01"}).status_code, 422)
        record = self.client.post("/api/admin/finance", json=payload)
        self.assertEqual(record.status_code, 201, record.text)
        self.assertEqual(record.json()["line_items"], payload["line_items"])
        document = self.client.get(f"/api/admin/finance/{record.json()['id']}/document")
        self.assertEqual(document.status_code, 200, document.text[:150] if document.status_code != 200 else "")
        self.assertIn(b"/Type /Pages", document.content)
        self.assertIn(b"/terms#refunds", document.content)
        self.assertIn(b"/Count 2", document.content)

    def test_document_resend_targets_the_associated_account_and_audits_failures(self):
        record = self.finance_record("invoice")
        path = f"/api/admin/finance/{record['id']}/send"
        with patch.object(settings, "resend_api_key", "qa-placeholder"), patch.object(settings, "resend_from_email", "finance@example.test"), patch("Backend.api.routes.finance.resend.Emails.send") as send:
            reply = self.client.post(path)
            self.assertEqual(reply.status_code, 200, reply.text)
            self.assertEqual(send.call_args.args[0]["to"], [self.student.email])
            self.assertTrue(send.call_args.args[0]["attachments"][0]["content"].startswith("JVBER"))
            send.side_effect = RuntimeError("QA delivery failure")
            self.assertEqual(self.client.post(path).status_code, 502)
        activity = self.client.get("/api/admin/recent-activity").json()
        failure = next(row for row in activity if row["action"] == "finance.document.email.failed")
        self.assertTrue(failure["parent_id"])
        self.assertEqual(failure["outcome"], "failure")

    def test_provider_validates_amount_currency_identity_and_status(self):
        transaction = {"paid_at": "2025-01-15T12:30:00Z", "customer": {"email": self.student.email},
                       "reference": "QA-PAY", "currency": "GHS", "domain": "test", "amount": 400, "status": "success"}
        with patch.dict("os.environ", {"PAYSTACK_SECRET_KEY": "sk_test_placeholder"}):
            for changes in ({}, {"amount": 300}, {"status": "pending"}, {"currency": "USD"},
                            {"customer": {"email": self.other.email}}, {"domain": "live"}, {"reference": "QA-OTHER"}):
                data = json.dumps({"status": True, "data": {**transaction, **changes}}).encode()
                with patch("Backend.api.routes.finance.urlopen", return_value=io.BytesIO(data)):
                    if changes:
                        with self.assertRaisesRegex(Exception, "does not match"):
                            verify_provider("QA-PAY", self.student)
                    else:
                        self.assertEqual(verify_provider("QA-PAY", self.student), (date(2025, 1, 15), True))

    def test_ticket_transitions_history_and_access(self):
        self.actor = self.student.id
        opened = self.client.post("/api/support", json={"title": "Missing receipt", "description": "Please check my receipt",
                                                        "category": "payment", "priority": "urgent"})
        self.assertEqual(opened.status_code, 201, opened.text)
        ticket = opened.json()
        self.assertEqual(ticket["priority"], "normal")
        self.assertEqual(self.client.get("/api/admin/support").status_code, 403)
        self.actor = self.other.id
        self.assertEqual(self.client.get("/api/support").json(), [])
        self.actor = self.admin.id
        update = {"ids": [ticket["id"]], "note": "Checked the account", "assign_to_me": True}
        self.assertEqual(self.client.post("/api/admin/support/update", json={**update, "status": "closed"}).status_code, 409)
        for status in ("in_progress", "closed"):
            response = self.client.post("/api/admin/support/update", json={**update, "status": status})
            self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get("/api/admin/support/" + ticket["id"]).json()["ticket"]["status"], "closed")
        self.assertEqual(len(self.client.get("/api/admin/support/" + ticket["id"]).json()["updates"]), 2)
        recent = self.client.get("/api/admin/recent-activity").json()
        self.assertIn("support.ticket.updated", {event["action"] for event in recent})
        self.assertNotIn("Checked the account", json.dumps(recent))

    def test_manual_income_edit_and_date_reports_preserve_verified_payments(self):
        base = "/api/admin/finance"
        custom = {"kind": "income", "name": "Partner support", "is_default": True}
        categories = self.client.post(base + "/categories", json=custom)
        self.assertEqual(categories.status_code, 200, categories.text)
        self.assertEqual(categories.json()["income"][0]["name"], "Partner support")
        self.assertEqual(categories.json()["expense"][0]["name"], "Other expense")
        payload = {"kind": "income", "description": "Manual entry", "account_id": str(self.student.id),
                   "amount_minor": 2500, "record_date": "2025-01-15"}
        income = self.client.post(base, json=payload)
        self.assertEqual(income.status_code, 201, income.text)
        self.assertEqual(income.json()["category"], "Partner support")
        income_url = base + "/" + income.json()["id"]
        edited = self.client.put(income_url, json={**payload, "amount_minor": 3500})
        self.assertEqual(edited.status_code, 200, edited.text)
        self.assertEqual(edited.json()["id"], income.json()["id"])
        expense = self.finance_record()
        expense_url = base + "/" + expense["id"]
        expense_edit = self.client.put(expense_url, json={
            **payload, "kind": "expense", "category": "Operations", "amount_minor": 1200,
        })
        self.assertEqual(expense_edit.status_code, 200, expense_edit.text)

        with Session(self.engine, expire_on_commit=False) as session:
            payment = FinanceRecord(kind="payment", recipient_name=self.student.name, recipient_email=self.student.email,
                                    category="Application fees", description="Processing fee", account_id=self.student.id,
                                    amount_minor=400, record_date=date(2025, 1, 15), reference="live-student-payment")
            session.add(payment)
            session.commit()
        self.assertEqual(self.client.put(f"{base}/{payment.id}", json=payload).status_code, 409)
        self.assertEqual(self.client.get(base).json()["items"][0]["amount_minor"], 400)
        for params in ({"day": "2025-01-15"}, {"start_date": "2025-01-14", "end_date": "2025-01-15"}):
            summary = self.client.get(base + "/summary", params=params)
            self.assertEqual(summary.status_code, 200, summary.text)
            self.assertEqual({key: summary.json()[key] for key in ("portal_income", "internal_income", "revenue", "expenses", "net")},
                             {"portal_income": 400, "internal_income": 3500, "revenue": 3900, "expenses": 1200, "net": 2700})
            income_list = self.client.get(base, params={**params, "kind": "income", "category": "Partner support"})
            self.assertEqual(income_list.json()["total"], 1)
        self.assertEqual(self.client.get(base + "/summary", params={"day": "2025-01-16"}).json()["revenue"], 0)
        self.assertEqual(self.client.get(base + "/summary", params={"start_date": "2025-01-15", "end_date": "2025-01-14"}).status_code, 422)
        self.assertEqual(self.client.get(base + "/summary", params={"month": "2025-01", "day": "2025-01-15"}).status_code, 422)
        for fmt, prefix in (("pdf", b"%PDF-"), ("xlsx", b"PK")):
            self.assertTrue(self.client.get(base + "/report", params={"day": "2025-01-15", "format": fmt}).content.startswith(prefix))
        self.assertTrue(self.client.get(income_url + "/document").content.startswith(b"%PDF-"))
        audit = self.client.get("/api/admin/recent-activity").json()
        self.assertIn("finance.income.updated", [event["action"] for event in audit])
        self.assertIn("finance.summary.export", [event["action"] for event in audit])

        self.actor = self.student.id
        for path, params in ((base + "/summary", {"day": "2025-01-15"}), (base + "/categories", {}),
                             (base + "/report", {"day": "2025-01-15", "format": "pdf"})):
            self.assertEqual(self.client.get(path, params=params).status_code, 403)
        self.assertEqual(self.client.put(income_url, json=payload).status_code, 403)
        self.assertEqual(self.client.get(f"/api/finance/documents/{income.json()['id']}").status_code, 404)
        self.assertEqual(self.client.get("/api/finance/documents").json()["total"], 1)



    def test_custom_role_is_enforced_and_redefinable(self):
        role = self.client.post("/api/admin/workspace-roles", json={"name": "QA Finance", "permissions": ["finance"]})
        self.assertEqual(role.status_code, 200, role.text)
        role_id = role.json()["id"]
        invitation = self.client.post("/api/admin/staff/invitations", json={"email": self.student.email, "role": role_id})
        self.assertEqual(invitation.status_code, 200, invitation.text)
        self.actor = self.student.id
        accepted = self.client.post("/api/staff/invitations/accept", json={"token": invitation.json()["token"]})
        self.assertEqual(accepted.status_code, 200, accepted.text)
        self.assertEqual(self.client.get("/api/admin/finance").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/finance/summary?day=2025-01-15").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/finance/categories").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/support").status_code, 403)
        self.actor = self.admin.id
        changed = self.client.put("/api/admin/workspace-roles/" + role_id, json={"name": "QA Support", "permissions": ["support"]})
        self.assertEqual(changed.status_code, 200, changed.text)
        self.actor = self.student.id
        self.assertEqual(self.client.get("/api/admin/finance").status_code, 403)
        self.assertEqual(self.client.get("/api/admin/support").status_code, 200)
