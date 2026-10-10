# Fortune Intern Network – Agent Instructions

Read this file fully before doing anything. Update it before you finish.

## Guardrails (mandatory)
1. Do exactly what the user asked. Nothing extra.
2. Do not touch any code outside the task without the user's permission.
   Ask first and explain why it is needed.
3. Double-check your work before reporting it.
4. If you are unsure about anything, say so. Never guess or invent facts.
5. If the user must run a command after your change, tell them
   the command and explain in simple words why.
6. Explain technical points in simple English.
7. Group recommended fixes by severity: High / Medium / Low.
8. Never commit or print secrets (.env, API keys, JWT secrets).

## Project map
- Frontend/ – React 19 + Vite + Tailwind v4 + React Router
  - src/App.tsx – routes and login state
  - src/pages/ – screens, src/components/ – shared UI
  - src/services/ – all calls to the backend (api.ts is the base client)
- Backend/ – FastAPI. Database/ – models and Alembic migrations.
- Dev: `cd Frontend && npm ci && npm run dev` (needs backend on port 8000)
- Deploy: Vercel (vercel.json). Do not edit without permission.

## Known risks (do not "fix" without permission)
- Access token is in localStorage (see README, Authentication section).
- Payment is frontend-only; backend does not verify it.

## Handoff log (newest first, keep last ~10 entries)
Format: DATE – agent – what changed (files) – what is unfinished – commands the user must run
- 2026-10-10 – Claude – added paste handling to the 6-digit email verification boxes (`handlePaste` + `onPaste` in `OTPModal`, src/pages/AuthPage.tsx only) – not yet tested in a browser; auto-fill from phone SMS/email (`autoComplete="one-time-code"`) not added – none (dev server hot-reloads)
- 2026-10-10 – Claude – re-applied this guardrails version of Frontend/AGENTS.md after the file was found reverted to the old Figma Make text (git branch at the time: fix/design-system; cause of the revert unknown) – nothing unfinished; the user still has to commit it – none
- 2026-10-08 – Claude – added `.github/copilot-instructions.md` at repo root (copy of the 8 guardrails, points here) and a log entry – nothing unfinished; not yet tested that Copilot loads it – none
- 2026-10-08 – Claude – replaced this file with the guardrails and handoff format above (Frontend/AGENTS.md only) – nothing unfinished – none
