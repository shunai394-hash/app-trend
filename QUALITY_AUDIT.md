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
7. **Scheduled ingestion — BLOCKED ON CONFIGURATION.** Cron route checks a bearer secret and requires `SUPABASE_SERVICE_ROLE_KEY`; the current Vercel variable list did not show that key or `CRON_SECRET`. Do not expose the service-role key in browser variables.
8. **Database access — IMPROVED.** Market snapshots have RLS enabled with public read-only policies appropriate for public chart data. Revoked direct EXECUTE on `public.rls_auto_enable()` from PUBLIC, anon, and authenticated roles after reviewing its SECURITY DEFINER body.
9. **Responsive/accessibility pass — PASS WITH LIMITS.** Existing CSS includes mobile breakpoints, visible keyboard focus, and reduced-motion handling. The floating login panel can still obscure some content on small screens; manual device/browser testing is required.
10. **Release/CI pass — IN PROGRESS.** Expanded CI triggers to include pull requests targeting `product/live-market-data-mvp`, because that is the current PR base. Latest Vercel build must finish successfully; CI status and the deployed login/history paths must then be retested.

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
