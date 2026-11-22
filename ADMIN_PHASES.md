# Fortune Intern admin rollout

- [x] Phase 1 — Application review. Assign reviewers, track deadlines, request missing documents, show decisions and reasons, and surface priority work.
- [x] Phase 2 — Employers and placements. Track employers, openings, capacity, confirmation, student acceptance, start, completion, and feedback.
- [x] Phase 3 — Finance reconciliation. Connect invoices to verified payments and surface unmatched payments, refunds, and settlement exceptions.
- [x] Phase 4 — Follow-up. Give support tickets a due date and student-facing resolution. Track and retry failed communication.
- [ ] Phase 5 — Pilot readiness. Verify staff access, provider configuration, monitoring, and recovery. Run a full intake in staging.

Mark each phase complete after its verification passes. Keep staging and production changes visible in the record.


## Verification

Phases 1–4 are complete in the local development workspace. They were checked with backend tests, frontend build checks, and desktop and mobile browser smoke tests. Provider calls in tests used controlled responses.

Phase 5 has a successful fresh PostgreSQL migration and a successful backup/restore rehearsal with synthetic intake records, plus a pilot runbook in `ADMIN_PILOT.md`. Staging verification remains open, including test-mode Paystack and Resend, external alerts, and staff sign-off on one complete intake.
