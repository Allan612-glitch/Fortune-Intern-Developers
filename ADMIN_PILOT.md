# Fortune Intern intake pilot

Run this checklist in a staging environment configured for one test intake. Use separate database, storage, Paystack test keys, and controlled email inboxes.

## Before inviting staff

- Apply Alembic migrations and confirm the database revision matches the application build.
- Verify staging `/healthz` and `/readyz`. Configure the host’s uptime monitor to check both paths and notify the team’s operations recipient.
- Confirm that the Paystack test keys are paired and that the frontend points to the staging API.
- Configure Resend with the staging sender and test recipient. Record provider acceptance and confirm a message reaches the controlled inbox.
- Rehearse PostgreSQL backup and restore in a disposable database. Compare the migration revision and counts for applications, placements, invoices, support tickets, and message records.
- Use separate staff accounts to check the Application reviewer, Placement coordinator, Finance officer, Support, and Operations roles. Check corresponding pages and API boundaries. Verify that a student sees only their own records, public support resolutions, and student-facing messages.

## Pilot sequence

1. Submit a test application as a student. Assign a reviewer, set a due date, and request a document. Confirm the request reaches the student’s in-app notifications. Send a reminder to the controlled inbox.
2. Clear the outstanding document request and accept the application, recording a decision reason. Create an employer and an opening with one available place. Propose the placement and record employer confirmation and the student’s acceptance. Check that a second placement cannot take the same slot.
3. Verify a Paystack test payment. Exercise invoice matching with the staging verification procedure and compare a sample settlement. Record a provider-confirmed refund for a known test transaction and confirm that test activity stays out of live finance totals. Use a fixture for the live-invoice match path because the workspace rejects test receipts for live invoices.
4. Open a ticket, assign it, set it overdue, and publish a student-facing resolution. Confirm that the private work note remains visible to staff only.
5. Review the application history and audit trail. Confirm who made each decision, who owns the next action, and what the student was told.

## Release record

Record the build, migration revision, date, reviewer, result, and evidence for each check. Record the uptime alert recipient and the last successful restore. Use the approved staging hosts and recipients when running provider and alert checks.

Before opening the first real intake, get admissions, placement, finance, and support sign-off. For a release problem, pause new intake, capture the error and affected records, and review the rollback with the operations owner. New tables may contain work entered after deployment, so preserve that data before changing the database schema.
