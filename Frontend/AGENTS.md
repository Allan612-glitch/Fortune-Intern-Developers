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
- 2026-10-21 – Claude – Lighthouse round (user request: best score on every metric): production (still the OLD build) scored mobile and desktop Accessibility 97, Best Practices 100, SEO 100, Agentic Browsing 59/65; failures were colour contrast (3 spots), label-content-name-mismatch (3 spots), CLS 0.144 mobile / 0.07 desktop, missing llms.txt. Changed: src/components/layout/Footer.tsx (both tel links' aria-label now include the visible number; copyright line text-white/40 to text-white/60 for contrast), src/pages/LandingPage.tsx (removed aria-label from the logo button so its name is the visible text), new public/llms.txt (plain description + page links, H1 present). NOT changed, waiting for the owner: gold text contrast ("INTERN" in the logo 1.79:1, hero "Right Internship." 2.46:1), CLS from font swap, and everything image-related (LCP). Fixes unverified until deployed and re-audited. Not compiled or browser-tested – run `npm run build`, `npx tsc --noEmit`, `npm run lint`
- 2026-10-21 – Claude – speed optimisation round 1 (user request; images deliberately skipped, user will decide later): (1) src/App.tsx: AuthPage, MainApp, AIChatWidget, ForgotPasswordPage, ResetPasswordPage, About, ContactUs, PrivacyPolicy and TAC are now loaded with `lazy()` inside one `<Suspense>` (LandingPage, Footer, CookieConsent, InstallBanner stay in the main file) so the landing page downloads less JavaScript; (2) `GoogleOAuthProvider` moved from src/main.tsx into App.tsx `authPage()` so Google's sign-in script loads only on /login and /register (UNVERIFIED: I could not search the code for other users of `@react-oauth/google`; if any other page uses it, it will throw "must be used within GoogleOAuthProvider"); (3) Google Fonts moved from the `@import` at the top of src/index.css into index.html (`preconnect` + `<link rel="stylesheet">`, same families), so the line in the Styling section above about CSS `@import` for fonts is now out of date. NOT done: image fixes (hero/student photos, 1280px logo), `fetchpriority` on the hero image, trimming unused font families, preconnect to the backend. Not compiled or browser-tested – run `npm run build`, `npx tsc --noEmit`, `npm run lint`, then `npm run preview` and compare with the 2026-10-21 baseline (mobile LCP 3.5s, one 476KB script)
- 2026-10-19 – Claude – PWA install support (user request): new public/manifest.webmanifest, public/sw.js (offline fallback page only, caches nothing else), public/offline.html, src/pwa.ts (catches the browser install prompt, registers the service worker in production only), src/components/InstallBanner.tsx (bottom banner with the attach1.png logo, "Install" and "Not now"; inside /app/* on phones it sits above the bottom bar and left of the chat button; hidden until the cookie banner is answered, when already installed, and for 7 days after "Not now" via localStorage key `fin_install_dismissed`); wired in index.html (manifest link), src/main.tsx (registerServiceWorker) and src/App.tsx (renders InstallBanner after CookieConsent); vercel.json NOT edited – UNFINISHED: the icon files the manifest points to (public/icons/icon-192.png, icon-512.png, icon-maskable-512.png) are made from the logo (emblem only, no words) by the one-off script scripts/make-icons.mjs (user could not download the PNGs I made; run `npm install --no-save sharp` then `node scripts/make-icons.mjs` in Frontend; script can be deleted after) – until public/icons/ has the 3 files the browser will not offer install; privacy policy text does not mention `fin_install_dismissed`; the iPhone hint (iOS has no install prompt API, so it shows "Share, then Add to Home Screen" text and a "Got it" button) has not been tried on a real iPhone – not compiled or browser-tested – run `npm run build`, `npm run lint`, `npx tsc --noEmit`, then `npm run preview` and check DevTools > Application > Manifest
- 2026-10-15 – Claude – landing hero (user request): added a "Create Account" outline button beside "Find an Internship" (opens the register form via `onStudentPortal("register")`); hero h1 now `font-extrabold` (800); landing h1 and h2 now use Inter via a new `.landing-fonts :is(h1, h2)` rule in index.css (h3/h4 stay Plus Jakarta Sans; this overrides the earlier "Plus Jakarta Sans headings" rule for h1/h2 on the user's request) – not compiled or browser-tested – run `npm run build`, `npm run lint`, `npx tsc --noEmit`
- 2026-10-15 – Claude – Job 4 (design fixes, part 1): created Frontend/DESIGN_FIXES.md (fresh list F-01 to F-10; old D-03/D-12/D-13/D-18 not recreated). Changed: BottomNav.tsx (Announcements now in the bar, 7 items, short labels "News" and "Applied", aria-label keeps the full name); index.css (`--muted-foreground` #6b7280 to #596070); HomePage.tsx and ProfilePage.tsx (white/40-55 text on dark raised to white/70). Already done by the team: Applications in sidebar and bottom bar; tracker card is not hidden under 768px. NOT done: other-page emerald and styling cleanup, text under 12px, touch targets, icon-button labels, placeholder copy, Profile Education "+ Add" – waiting for owner decisions (see DESIGN_FIXES.md). Not compiled or browser-tested – run `npm run build`, `npm run lint`, `npx tsc --noEmit`, then check the phone bottom bar at 375px
- 2026-10-15 – Claude – Job 3 (landing page only): removed AI-template styling in src/pages/LandingPage.tsx and src/index.css: hero badge, hero green side panel, floating job cards (FloatingRole deleted), shadow-xl/2xl/lg on search card, hero and student photos, caption card and mobile menu, gradient over hero photo, hover:scale-110, hover-lift on cards; emerald replaced with navy/gold; landing eyebrow labels now gold uppercase via `.landing-fonts .section-eyebrow` and new token `--gold-text`; `.check-dot` now navy tint. Kept: hero note, Plus Jakarta Sans, gold footer titles, gold "Intern" in logo. NOT done: fake stats (500+, 1,000+, 100+, 20+) and fake testimonials still on the page with emerald "Placeholder" labels (user will send real numbers); text under 12px; other pages (user to decide). Not compiled or browser-tested – run `npm run build`, `npm run lint`, `npx tsc --noEmit`
- 2026-10-15 – Claude – Job 2: moved #opportunities (list) to right after the #internships search bar in LandingPage.tsx; order is now hero, search, list, About, How it works, For students, stats, testimonials, CTA. Low: About (white) now follows the list (white) and How it works (grey) sits next to For students (grey) so they look like one band. Not browser-tested
- 2026-10-15 – Claude – Job 1: OTP paste handler (`handlePaste`) already existed; added `autoComplete="one-time-code"` to the six boxes in OTPModal (src/pages/AuthPage.tsx) with the user's permission. Unsure it fills all boxes on phones because each box has maxLength=1. Not browser-tested
- 2026-10-14 – Claude – re-applied the cookie consent banner after the user's local files were lost, skipping what the team already built: new src/components/CookieConsent.tsx ("Accept all cookies" / "Reject all cookies"; saves `fin_cookie_consent` = `all` or `necessary` in localStorage; after a click shows a 2.6 second message, "All cookies accepted" or "Cookies rejected. Necessary storage only"; links go to /privacy-policy and /terms#refunds) and src/App.tsx (imports it and renders `<CookieConsent />` right after `<Routes>`, so it shows on every page) – NOT re-applied because the team already has them: About, Contact, Privacy Policy and Terms as routed pages plus the footer links, so the old pop-up version was dropped – not compiled or browser-tested; nothing reads the saved choice yet (Accept and Reject behave the same); on phones inside /app the banner may overlap the bottom nav and chat button; the team's src/pages/companypages/PrivacyPolicy.tsx still says "your OpenAI key" stays on the device and the app has no OpenAI key – wait for the user's decision – run `npm run build`, `npm run lint` and `npx tsc --noEmit` in Frontend, then clear localStorage (key `fin_cookie_consent`), reload, and click Accept and Reject once each
- 2026-10-12 – Copilot – merged `main` into `add/companypages`, preserving company-page routes and integrating updated frontend behavior – frontend build and lint pass – none
- 2026-10-12 – Copilot – connected landing-page footer company links to About, Contact, Privacy, and Terms routes (`src/pages/LandingPage.tsx`) – frontend build and lint pass – none
- 2026-10-12 – Copilot – connected remaining landing/company footer links to landing sections, authenticated app pages, and cookie/refund policies (`src/pages/LandingPage.tsx`, `src/components/layout/Footer.tsx`) – frontend build and lint pass – none
- 2026-10-10 – Claude – added paste handling to the 6-digit email verification boxes (`handlePaste` + `onPaste` in `OTPModal`, src/pages/AuthPage.tsx only) – not yet tested in a browser; auto-fill from phone SMS/email (`autoComplete="one-time-code"`) not added – none (dev server hot-reloads)
- 2026-10-10 – Claude – re-applied this guardrails version of Frontend/AGENTS.md after the file was found reverted to the old Figma Make text (git branch at the time: fix/design-system; cause of the revert unknown) – nothing unfinished; the user still has to commit it – none
- 2026-10-08 – Claude – added `.github/copilot-instructions.md` at repo root (copy of the 8 guardrails, points here) and a log entry – nothing unfinished; not yet tested that Copilot loads it – none
- 2026-10-08 – Claude – replaced this file with the guardrails and handoff format above (Frontend/AGENTS.md only) – nothing unfinished – none
