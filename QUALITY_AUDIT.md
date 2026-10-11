# App Trend — Quality Audit Log

Date: 2026-10-11
Branch: `feat/google-login`
Target: improve toward award-level craft; this log is an engineering self-review, not a claim of an award or independent validation.

## Ten review passes

1. **Primary journey — PASS WITH LIMITS.** The homepage is the research entry point and the user confirmed Google sign-in works. The product still needs a clearer post-login next action and a saved-workflow benefit.
2. **OAuth wiring — PASS.** The browser uses Supabase Auth; Google credentials remain in the Supabase provider configuration rather than being embedded in client code.
3. **Session lifecycle — PASS.** The UI checks the existing session and subscribes to auth state changes. Added a catch path for session lookup network failures.
4. **Auth error recovery — IMPROVED.** Added catch/finally handling for sign-in and sign-out network failures so the control does not remain stuck in a busy state.
5. **Environment naming — IMPROVED.** The history API now accepts the actual Vercel Supabase URL and public-key variable names as fallbacks. This fixes a naming mismatch but does not create history records by itself.
6. **Data integrity — PASS WITH LIMITS.** UI and API correctly distinguish chart rank from downloads/revenue/profit and preserve per-feed errors. Current snapshot tables contain zero rows, so trend history is not yet proven end-to-end.
7. **Scheduled ingestion — PARTIALLY CONFIGURED.** Added server-side `SUPABASE_URL` and a sensitive production `CRON_SECRET` in Vercel. The cron route still requires `SUPABASE_SERVICE_ROLE_KEY`, which is not present in the current Vercel variable list. Do not expose the service-role key in browser variables.
8. **Database access — IMPROVED.** Market snapshots have RLS enabled with public read-only policies appropriate for public chart data. Revoked direct EXECUTE on `public.rls_auto_enable()` from PUBLIC, anon, and authenticated roles after reviewing its SECURITY DEFINER body.
9. **Responsive/accessibility pass — PASS WITH LIMITS.** Existing CSS includes mobile breakpoints, visible keyboard focus, and reduced-motion handling. The floating login panel can still obscure some content on small screens; manual device/browser testing is required.
10. **Release/CI pass — BUILD PASS; MANUAL END-TO-END TEST STILL REQUIRED.** The exact Google-login PR head passed GitHub Actions install, lint, and production build. The merged product-branch deployment reached Vercel `READY` and the `app-trend-pi.vercel.app` alias was moved to that deployment. Google login had been confirmed by the user before the latest hardening changes; retest login/logout and history after the alias update.

## Changes made during this audit

- Fixed Supabase environment-variable fallback in `app/api/history/route.ts`.
- Added network error handling to Google auth controls.
- Expanded CI pull-request triggers to the active product branch.
- Restricted direct execution of the SECURITY DEFINER RLS helper function.

## Open release blockers

- Wait for the latest Vercel deployment and verify it is READY.
- Confirm the current PR checks run and pass on the exact head commit.
- Configure server-only `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` in Vercel before expecting the daily snapshot job to write data.
- Trigger the snapshot route safely and verify four feed statuses and non-zero stored snapshots.
- Test mobile layout, keyboard-only navigation, login/logout, refresh/session persistence, and `/history` on the deployed site.
- Enable Supabase leaked-password protection in Auth settings (current advisor warning).
- Conduct an independent third-party review after these checks; this self-review is not a substitute for it.
