# App Trend — Quality Audit Log

Date: 2026-10-11  
Branch: `product/live-market-data-mvp`  
Target: raise product craft toward Awwwards / Webby Awards / FWA standards. This is a self-audit, not a claim of award-level readiness or independent validation.

## Follow-up audit — 10 rounds

1. **Product promise and journey — HOLD.** The main proposition is clear: compare US/Japan public App Store charts, then form a testable app hypothesis. The logged-in experience still has no saved research or cloud sync, so the benefit of creating an account is not yet strong.
2. **Data honesty — PASS WITH LIMITS.** The interface explicitly says chart rank is not downloads, revenue, profit, or proof of demand. The current feed is Apple Top Free/Top Paid, 25 apps per country/chart; it is a starting signal, not a complete market-research engine.
3. **Partial-source status — FIXED.** The header no longer says “LIVE SOURCE” when only some feeds succeed. It now distinguishes `ALL SOURCES`, `PARTIAL DATA`, `SOURCE CHECK`, and `CHECKING SOURCES`, with a polite live announcement for assistive technology.
4. **Search empty state — FIXED.** A search with zero matching apps now gives a search-specific message instead of incorrectly implying the market feed itself is empty.
5. **Hypothesis quality — PASS WITH LIMITS.** The brief keeps observation and hypothesis separate, links source feeds, and proposes customer interviews plus a small validation experiment. It does not yet include app-review mining, search-demand data, competitor pricing, or validated willingness-to-pay evidence.
6. **Clipboard failure recovery — FIXED.** If browser clipboard access is denied, the full brief is exposed in a readable, selectable text area with visible keyboard focus styling.
7. **Filter accessibility — IMPROVED.** Country and chart selectors expose their selected state using `aria-pressed`. Automated accessibility scanning and a real screen-reader pass are still outstanding.
8. **Mobile obstruction — IMPROVED, NOT VERIFIED.** The persistent login panel was reduced from 340px to 250px and its redundant heading removed. Test on actual narrow viewports before calling the mobile experience finished.
9. **History pipeline and security — BLOCKED.** Both `market_snapshot_runs` and `market_snapshots` currently have zero rows. Vercel still needs server-only `SUPABASE_SERVICE_ROLE_KEY`; the scheduled snapshot has not been proven end-to-end. Supabase also reports leaked-password protection disabled.
10. **CI, deployment, and release — BUILD PASS; MANUAL E2E PENDING.** Commit `fa30720bf0df7965cb314f4118b44a30c94e1aca` passed GitHub Actions install, lint, and build (run [38137703854](https://github.com/shunai394-hash/app-trend/actions/runs/38137703854)). Vercel deployment `dpl_54ZbDTshjEHBHffuNDuZ2SbDasYC` reached `READY`, and `app-trend-pi.vercel.app` was reassigned to it. Its Vercel target is still `null` (preview), not a confirmed Production target. Browser login/logout, session persistence, responsive layout, and history must still be checked manually.

## Changes made in this follow-up

- Corrected market-source status when only a subset of feeds is available.
- Added a relevant empty state when a search has no matches.
- Added a selectable full-text fallback when clipboard access fails.
- Added `aria-pressed` to country and chart filter buttons.
- Reduced the floating login panel's footprint on desktop and mobile.
- Verified the latest code commit with GitHub Actions install, lint, and production build.
- Reassigned the public alias to the latest code deployment after it reached `READY`.

## Release blockers and next checks

- Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel as a server-only sensitive environment variable. Never use a `NEXT_PUBLIC_` name for it.
- Trigger the snapshot route with the configured secret; verify all four feed statuses and non-zero stored snapshots in both tables.
- Enable Supabase leaked-password protection in Auth settings: [remediation guide](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Manually test Google login/logout, refresh/session persistence, partial source failure, empty search, clipboard fallback, keyboard-only navigation, mobile layouts, and `/history`.
- Add persistent saved briefs so login has a clear user benefit.
- Broaden evidence beyond rankings: app reviews, search intent, competitor pricing, user pain, and willingness-to-pay validation.
- Run an independent review and fix findings before claiming submission or award readiness.

## Standard used

The Webby Awards evaluate websites and apps across content, navigation, visual design, functionality, interactivity, innovation, and overall experience. A polished visual layer alone is not sufficient. This log tracks engineering findings and remaining evidence gaps; it does not certify award readiness.


## Quality pass 11 — operational truthfulness

- **Fixed:** `GET /api/health` no longer returns a green status just because the Next.js route is running.
- It now checks the server-only Supabase service credentials, queries the latest snapshot-run record with a bounded timeout, and reports database connectivity, snapshot freshness, latest run status, and recorded app count.
- It returns HTTP 503 with `degraded` when storage is not configured, the database cannot be reached, no snapshot has been recorded, or the latest run is stale/failed. It never returns secret values.
- **Verification status:** commit `f670e2128e60ac774168502c83fce2709e56a1fc` and follow-up audit commit `9357ebf8c9cc3defcbf768acb354948ca6ea36ba` built successfully on Vercel (`READY`); GitHub Actions CI passed (run [38175052117](https://github.com/shunai394-hash/app-trend/actions/runs/38175052117)). Runtime smoke tests: `/api/market` HTTP 200 with 4/4 feeds; `/api/history` HTTP 200 but zero rows; `/api/health` HTTP 503/degraded in Preview because server-only writer secrets are intentionally not copied into Preview.
- **Still blocked:** both history tables exist with RLS enabled but have zero rows. Production cron invocation and persisted snapshot writes are not yet proven. Supabase security advisor still flags leaked-password protection as disabled.
