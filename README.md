# Fortune Intern Network

Fortune Intern Network is a Ghana-focused internship and career development platform. It connects students with internship programs, mentors, application tracking, notifications, and administrative tools.

The project includes a FastAPI backend, PostgreSQL database, Alembic migrations, and a React/Vite frontend.

## Features

- JWT authentication with password hashing
- User profiles and notification preferences
- Ghana-focused university and company selections
- Internship program catalog with search and filtering
- Application submission with resume upload
- Work-and-study registration for signed-in students, with account-owned submission history
- Application history and status tracking
- Frontend-only GHS 4 application fee display
- Personalized user dashboard
- In-app notifications with unread counts and targeted navigation
- Mentor registration and mentor discovery
- Mentorship requests with accept/decline decisions
- Mentor messaging and inbox
- Admin dashboard with:
  - User listing
  - User suspension and unsuspension
  - Mentor approval and revocation
  - Program creation and editing
  - Application review and accept/reject decisions
  - Resume review
  - Announcement publishing
- Public announcements loaded from the database
- Shared campus chapter directory loaded from the database, with administrator-managed chapters and executive boards
- Chapter position applications tied to signed-in accounts
- Responsive mobile-friendly interface

## Project Structure

```text
Backend/
  api/
    routes/
      admin.py
      announcements.py
      applications.py
      auth.py
      dashboard.py
      notifications.py
      profiles.py
      programs.py
  core/
    config.py
    security.py
  main.py

Database/
  Database/
    migrations/
      versions/
  models.py
  schemas.py
  alembic.ini

Frontend/
  index.html

requirements.txt
.env.example
```

## Requirements

- Python 3.11 or newer
- PostgreSQL
- Git
- A modern web browser

## Local login load test

The k6 script runs repeated invalid login attempts against a local backend, with a warm-up, steady-state, and ramp-down phase. Set `BASE_URL` only to `http://localhost` or `http://127.0.0.1`; other hosts are rejected by the script.

To also exercise successful logins, set `LOGIN_SUCCESS_EMAIL` and `LOGIN_SUCCESS_PASSWORD` for a local test account. The email may contain `{vu}` to use separate pre-created accounts per virtual user; `LOGIN_SUCCESS_VUS` controls that scenario's virtual-user count and defaults to 5 when using an email template.

```powershell
k6 run `
  -e LOGIN_SUCCESS_EMAIL="load-test-{vu}@example.test" `
  -e LOGIN_SUCCESS_PASSWORD="local-test-password" `
  -e LOGIN_SUCCESS_VUS="5" `
  loadtests/login-bots.js
```

Without those credentials, the successful-login scenario is omitted.

## Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd "Fortune Intern project"
```

### 2. Create and activate a virtual environment

Windows PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks script activation for the current session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```powershell
python -m pip install -r requirements.txt
```

### 4. Create the environment file

Copy `.env.example` to `.env` and replace the placeholder values.

```powershell
Copy-Item .env.example .env
```

At minimum, configure:

```env
DATABASE_URL=postgresql+psycopg://fortune:fortune@localhost/fortune
JWT_SECRET=use-a-random-secret-at-least-32-characters
ADMIN_EMAIL=admin@example.com
CRON_SECRET=use-a-random-secret-for-scheduled-account-cleanup
CONTACT_EMAIL=fortuneintern.gh@gmail.com
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@your-verified-domain.com
TURNSTILE_SECRET_KEY=your_cloudflare_turnstile_secret_key
SITE_IMAGES_BASE_URL=https://your-public-backend-domain
```

Set `SITE_IMAGES_BASE_URL` to the public HTTPS backend origin for landing-page
image uploads. Apply the latest migration and allow that origin in the
frontend's `img-src` CSP; the production backend domain is already allowed.

`JWT_SECRET` must be at least 32 characters. The backend will refuse to start with the example placeholder or an insecure short value.
Account deletion disables access immediately and retains account data for 30 days before scheduled permanent deletion. Configure `CRON_SECRET` in the production deployment; the daily Vercel Cron job uses it to authenticate the cleanup endpoint. Run the database migration after deployment so the deletion schedule can be stored.
Set `TURNSTILE_SECRET_KEY` in the backend environment and `VITE_TURNSTILE_SITE_KEY` in the frontend build environment. Signup presents a Cloudflare Turnstile challenge when an IP exceeds 500 signup requests per minute. Password login also challenges elevated-risk client groups; configure both keys so users can complete those challenges.

Verify the sender domain in Resend before registering accounts. Registration emails contain a six-digit OTP that expires after 10 minutes and is locked after five incorrect guesses; the user can request a new code. `POST /api/auth/register` requires Terms and Privacy acceptance and sends the OTP; `POST /api/auth/verify-email` accepts the email and OTP before the account is created. Acceptance timestamps are stored on the account and in the server-side consent log.

Contact form submissions are sent to `CONTACT_EMAIL` (defaulting to `fortuneintern.gh@gmail.com`) through Resend. Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for delivery; if email delivery is not configured or fails, the form reports the error and asks the sender to contact us directly.

## Database Setup

Create the PostgreSQL database and user referenced by `DATABASE_URL`, then run migrations from the repository root:

```powershell
.\.venv\Scripts\python.exe -m alembic -c Database/alembic.ini upgrade head
```

The migrations create the users, profiles, programs, applications, notifications, mentors, mentorships, announcements, founding-member registry, shared chapter directory, chapter applications, admin role, moderation flags, and registration-verification support tables. The latest migrations add lookup indexes, preserve existing application rows even if they contain active duplicates, and add login-failure counts to the rate-limit buckets. The privacy-retention migration adds consent records, date of birth on applications, program-cycle closure timestamps, and persistent letter references. The founding-member migration seeds the public founding team registry; only administrators can create, edit, or delete its records. The chapters page reads chapters and executive boards from the shared database directory rather than browser storage; when the directory is empty, the first administrator visit initializes it from the starter directory. Only administrators can save directory changes. Chapter position applications are tied to the signed-in account; only administrators can review submissions and update their status. The daily scheduled maintenance job closes programs when their application deadline has passed. Application records and uploaded resumes are purged three years after that recorded closure; consent logs are retained until three years after account deletion. Application submissions are checked in the API and serialized with a PostgreSQL transaction-scoped advisory lock so concurrent API requests cannot create a duplicate for the same user and program. The profile index remains unique and the migration stops if duplicate profiles need manual review.

Work-and-study registrations are stored by `POST /api/work-study` and can be retrieved by the signed-in student at `GET /api/work-study/mine`; `GET /api/work-study` and the read-only registration list in the staff Applications workspace are limited to staff with applications access. Registration records and their consent timestamps are deleted with the account. No payment is collected for work-and-study registration. Internship application CVs are optional; when supplied, the application API accepts only PDF files of at most 5 MiB. Profile documents and supervisor assessments retain their existing upload rules.

## Run the Backend

Always run Uvicorn from the project root so the `Backend` package can be imported correctly:

```powershell
.\.venv\Scripts\python.exe -m uvicorn Backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend URLs:

- API root: http://127.0.0.1:8000/
- Swagger documentation: http://127.0.0.1:8000/docs
- ReDoc documentation: http://127.0.0.1:8000/redoc

## Run the Frontend

Start the backend on `http://127.0.0.1:8000`, then run Vite:

```powershell
cd Frontend
npm ci
npm run dev
```

Set `VITE_TURNSTILE_SITE_KEY` in `Frontend/.env.local` for signup and elevated-risk login challenges. Vite proxies `/api` requests to `http://127.0.0.1:8000` by default. Set `API_PROXY_TARGET` to change the development backend address. When the frontend and backend are hosted separately, set the frontend build variable `VITE_API_URL` to the backend origin and include the frontend origin in backend `CORS_ORIGINS`.

Internship application payment is temporarily bypassed by default, including in production builds; applications are submitted to the backend without collecting a fee. To re-enable the existing Paystack checkout, set the frontend build variable `VITE_APPLICATION_CHECKOUT_ENABLED=true`, configure `VITE_PAYSTACK_PUBLIC_KEY` and the matching backend `PAYSTACK_SECRET_KEY`, then rebuild and deploy the frontend. The application API does not enforce or link payment verification, so this frontend setting is not a payment-enforcement mechanism.

## Admin Access

Admin access is controlled by the `users.is_admin` database field.

1. Register a normal account through the frontend.
2. Set that account as an admin in PostgreSQL:

```sql
UPDATE users
SET is_admin = TRUE
WHERE email = 'your-email@example.com';
```

3. Log out and log back in so the frontend receives the updated `is_admin` value.
4. The **Admin Dashboard** link will appear in the side panel.

Admins can manage users, mentors, programs, applications, resumes, and announcements. Announcements can target all students or students at one university; university-targeted announcements are only listed for that university's students and are sent in-app and by email to eligible recipients. Email delivery follows each student's email-update preference. Programs close automatically when their application deadline passes; programs without a deadline remain open until updated with one. Admin endpoints are protected and regular users receive `403 Forbidden`.

## Authentication and Security

- Passwords are hashed with Argon2 through `pwdlib`.
- Login risk is aggregated over a 10-minute window using both a keyed HTTP-client fingerprint and a keyed source-network prefix (/24 for IPv4, /64 for IPv6). Changing browser headers alone therefore does not reset risk within the same network. These are still coarse signals, not TLS fingerprints: proxy pools and changing networks can evade them. After five attempts with at least an 85% failure ratio, or twelve attempts with at least a 90% failure ratio, an untrusted login must pass Turnstile before password verification. Successful authentication issues an email- and client-bound trusted-device token that lasts 30 days.
- Application duplicate prevention is enforced for API submissions, including concurrent submissions. Existing duplicate application records are retained; direct database writes bypass the API-level guard.
- JWT bearer tokens are used for protected endpoints.
- Suspended users are blocked from protected API access.
- Admin routes require the persisted admin role or the configured `ADMIN_EMAIL`.
- Resume downloads are ownership-checked for users and admin-authorized for administrators.
- Uploaded resumes are stored under `Backend/uploads/`, which is excluded from Git.
- Never commit `.env`, Resend API keys, JWT secrets, or uploaded documents.

## Important API Groups

- `/api/auth` - registration, login, and current-user lookup
- `/api/profile` - authenticated profile retrieval and updates
- `/api/programs` - public program listing, search, filtering, and details
- `/api/applications` - authenticated application submission and history
- `/api/applications/verify-letter?reference=...` - rate-limited public verification of a sent recommendation letter reference
- `/api/dashboard` - personalized dashboard data
- `/api/notifications` - notifications, unread counts, read actions, and preferences
- `/api/mentors` - mentor discovery and registration
- `/api/mentorships` - mentorship requests and decisions
- `/api/messages` - authenticated conversations and messaging
- `/api/announcements` - public announcement listing
- `/api/admin` - protected administrative management endpoints

## Testing and Validation

Quick backend import check:

```powershell
.\.venv\Scripts\python.exe -c "from Backend.main import app; print('Backend import ok')"
```

Compile Python files:

```powershell
.\.venv\Scripts\python.exe -m compileall Backend Database
```

Validate the inline frontend script:

```powershell
node -e "const fs=require('fs'); const html=fs.readFileSync('Frontend/index.html','utf8'); const match=html.match(/<script>([\\s\\S]*)<\\/script>/); if(!match) throw new Error('Inline script not found'); new Function(match[1]); console.log('Frontend script ok')"
```

## Current Development Notes

- Internship checkout is temporarily bypassed by default. When re-enabled, Paystack verification is recorded in the finance ledger; application creation remains separate and does not enforce or link a verified payment. Refund automation is not implemented.
- Registration requires an email OTP sent through Resend before the account is created.
- Mentor approval is required before a mentor appears in the public mentor directory.
- Application status changes are controlled by admins.
- Profile experience, skills, CGPA, documents, and the application applicant/academic details are persisted by the backend. Profile name/username editing is not supported.
- Profile and resume documents use the configured Cloudflare R2 bucket. Document uploads require the R2 settings in `.env`.
- Email verification codes can be resent for pending registrations, with a 60-second cooldown.
