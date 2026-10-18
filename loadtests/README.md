# Local login load test

`login-bots.js` sends one intentionally incorrect login attempt from each of up to 1,000 simulated clients. It gradually ramps to 1,000 virtual users, varying client headers to exercise the login-risk controls. Expected responses are `401` (invalid credentials), `403` (verification required), or `429` (rate limited).

The script rejects non-local targets. It only accepts `http://localhost` or `http://127.0.0.1`; it does not target a hosted service.

## Run it

Use a local, disposable development database. Check `DATABASE_URL` in the backend's `.env` before starting it: a local server can otherwise still connect to a shared or hosted database.

In one PowerShell terminal at the repository root, start the backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn Backend.main:app --host 127.0.0.1 --port 8000
```

In a second terminal at the repository root, run the test:

```powershell
k6 run .\loadtests\login-bots.js
```

For a different local port, set `BASE_URL` to a localhost URL before running k6:

```powershell
$env:BASE_URL = "http://127.0.0.1:8001"
k6 run .\loadtests\login-bots.js
```

Each simulated client uses a unique, non-deliverable `example.invalid` email and an incorrect password; no real account is needed. The test sends at most 1,000 login requests total, not repeated password attempts per client. It is a local control exercise, not a production-capacity benchmark. Allow the login-risk window to expire before relying on subsequent local login tests.
