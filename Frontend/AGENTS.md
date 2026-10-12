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

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.
## Handoff log (newest first, keep last ~10 entries)
Format: DATE – agent – what changed (files) – what is unfinished – commands the user must run
- 2026-10-12 – Copilot – merged `main` into `add/companypages`, preserving company-page routes and integrating updated frontend behavior – frontend build and lint pass – none
- 2026-10-12 – Copilot – connected landing-page footer company links to About, Contact, Privacy, and Terms routes (`src/pages/LandingPage.tsx`) – frontend build and lint pass – none
- 2026-10-12 – Copilot – connected remaining landing/company footer links to landing sections, authenticated app pages, and cookie/refund policies (`src/pages/LandingPage.tsx`, `src/components/layout/Footer.tsx`) – frontend build and lint pass – none
- 2026-10-10 – Claude – added paste handling to the 6-digit email verification boxes (`handlePaste` + `onPaste` in `OTPModal`, src/pages/AuthPage.tsx only) – not yet tested in a browser; auto-fill from phone SMS/email (`autoComplete="one-time-code"`) not added – none (dev server hot-reloads)
- 2026-10-10 – Claude – re-applied this guardrails version of Frontend/AGENTS.md after the file was found reverted to the old Figma Make text (git branch at the time: fix/design-system; cause of the revert unknown) – nothing unfinished; the user still has to commit it – none
- 2026-10-08 – Claude – added `.github/copilot-instructions.md` at repo root (copy of the 8 guardrails, points here) and a log entry – nothing unfinished; not yet tested that Copilot loads it – none
- 2026-10-08 – Claude – replaced this file with the guardrails and handoff format above (Frontend/AGENTS.md only) – nothing unfinished – none
