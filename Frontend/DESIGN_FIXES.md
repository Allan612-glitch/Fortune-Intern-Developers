# Design fixes checklist (rebuilt 2026-10-15)

The old checklist was lost. This list is rebuilt from the design critique findings and re-checked against the current code.
The old items D-03, D-12, D-13 and D-18 were decision items. Their content is NOT known and is NOT recreated here.

Status key: [x] done  [~] changed, not browser-tested  [ ] open  [?] needs a decision from the owner

Rules for any agent: read AGENTS.md first, change only what is listed, update this file and the AGENTS.md handoff log when you finish.

## High

- [x] F-01 Applications missing from sidebar and phone bottom bar. Already fixed by the team: `navItems` in `components/layout/Sidebar.tsx` includes "applications", and `BottomNav.tsx` shows it.
- [~] F-02 Announcements missing from the phone bottom bar. Removed the filter in `components/layout/BottomNav.tsx`; the bar now has 7 items. Short labels "News" (Announcements) and "Applied" (Applications) so they fit at 375px; full names are kept in `aria-label`. [?] Owner to approve the short labels.
- [x] F-03 Tracker card on HomePage hidden under 768px. Not true in the current code: only the decorative tilted shape behind it has `hidden md:block`. The card itself always shows. Still to check in a browser at 375px: the 4 stat boxes use 9px labels and may be cramped.

## Medium

- [?] F-04 Two accent colours (emerald on the public site, gold in the app). Landing page done in Job 3. Still emerald: `AuthPage.tsx` (eyebrows, reset-password modal), `HomePage.tsx` (badges, one icon tile), `ProfilePage.tsx` (CGPA line), `index.css` (`.section-eyebrow` base, `.company-eyebrow`). Other files not checked. Waiting for the owner to say whether the cleanup continues to the other pages.
- [ ] F-05 Text smaller than 12px. Found in: `index.css` (`.nav-label` 10px, `.job-chip`, `.company-eyebrow`), `HomePage.tsx` (9px and 10px), `AuthPage.tsx` (10px, 11px), `ProfilePage.tsx` (9px, 10px). Not changed. The 7-item bottom bar cannot use 12px labels without wrapping. Other files not checked.
- [~] F-06 Low contrast on muted text. `--muted-foreground` in `index.css` changed from #6b7280 (about 4.4:1 on the cream background) to #596070 (about 5.8:1, my calculation). White text on dark raised to `text-white/70` in `HomePage.tsx` (3 places) and `ProfilePage.tsx` (2 places). Other white/40 to white/55 uses in other files not checked.

## Low

- [ ] F-07 Icon-only buttons without labels. Checked: Sidebar close, Profile dialog close, skill remove all have `aria-label`. `TopBar.tsx` and the other pages not checked. [?] Unsure.
- [ ] F-08 Touch targets under 44px. Seen: reset-password and profile close buttons are 36px; Profile "Add", "Clear form", "Download", "Delete" are small text buttons. Not changed.
- [ ] F-09 Placeholder and demo copy. Seen in `HomePage.tsx`: "Ready to send to Flutterwave", hard-coded "New" badge, "Browse hundreds of roles", stats "20+" and "< 72h". Landing page fake stats and testimonials wait for real numbers from the owner.
- [?] F-10 Profile "Education + Add" button does nothing (`ProfilePage.tsx`, no onClick). Owner to choose: remove the button, or build an education form (needs a backend field, which does not exist in the code I read).
