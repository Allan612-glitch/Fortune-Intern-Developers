# Fortune Intern Network

Fortune Intern Network is a Ghana-focused internship and career development platform. It connects students with internship programs, mentors, application tracking, notifications, and administrative tools.

The project currently includes a FastAPI backend, PostgreSQL database, Alembic migrations, and a responsive static HTML/CSS/JavaScript frontend.

## Features

- JWT authentication with password hashing
- User profiles and notification preferences
- Ghana-focused university and company selections
- Internship program catalog with search and filtering
- Application submission with resume upload
- Application history and status tracking
- Frontend-only GHS 3 application fee display
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
      mentorship.py
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
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@your-verified-domain.com
```

`JWT_SECRET` must be at least 32 characters. The backend will refuse to start with the example placeholder or an insecure short value.

Verify the sender domain in Resend before registering accounts. Registration emails contain a six-digit OTP that expires after 10 minutes. `POST /api/auth/register` sends the OTP and `POST /api/auth/verify-email` accepts the email and OTP before the account is created.

## Database Setup

Create the PostgreSQL database and user referenced by `DATABASE_URL`, then run all migrations from the `Database` directory:

```powershell
cd Database
..\.venv\Scripts\python.exe -m alembic -c alembic.ini upgrade head
cd ..
```

The migrations create the users, profiles, programs, applications, notifications, mentors, mentorships, announcements, admin role, moderation flags, and registration-verification support tables.

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

The frontend is a static file. For reliable API requests, serve it with a local HTTP server from the project root:

```powershell
python -m http.server 5500 --directory Frontend
```

Open:

http://localhost:5500

Do not open the HTML with `file://` if the browser blocks requests to the backend because of origin restrictions.

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

Admins can manage users, mentors, programs, applications, resumes, and announcements. Admin endpoints are protected and regular users receive `403 Forbidden`.

## Authentication and Security

- Passwords are hashed with Argon2 through `pwdlib`.
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

- Payment is currently a frontend-only GHS 3 display. No payment provider or backend payment processing is connected.
- Registration requires an email OTP sent through Resend before the account is created.
- Mentor approval is required before a mentor appears in the public mentor directory.
- Application status changes are controlled by admins.
- The frontend is currently a single static HTML application rather than a bundled framework app.


