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
- **Verification status:** health-check code and audit notes built successfully on Vercel (`READY`); GitHub Actions CI passed for the health-check commit (run [38175052117](https://github.com/shunai394-hash/app-trend/actions/runs/38175052117)). Runtime smoke tests on Preview: `/api/market` HTTP 200 with 4/4 feeds; `/api/history` HTTP 200 but zero rows; `/api/health` HTTP 503/degraded because server-only writer secrets are intentionally not copied into Preview.
- **Still blocked:** both history tables exist with RLS enabled but have zero rows. Production cron invocation and persisted snapshot writes are not yet proven. Supabase security advisor still flags leaked-password protection as disabled.


## Quality pass 12 — protect research from accidental loss

- **Added:** the hypothesis form and generated brief now auto-save to this browser's local storage and restore on return.
- The UI labels the save state, explains that the data stays in this browser (no server upload or cross-device sync), and offers a clear reset action. Shared-device caution is explicit.
- Restored brief data is type-checked before rendering; malformed local storage is ignored rather than blindly trusted.
- Added keyboard-visible focus, touch-sized reset control on mobile, and a restrained destructive-action hover state.
- **Verification:** Vercel build reached `READY` for commit `8cd09407f52b0b06f89925f18bac93fbce07ca66`. Runtime smoke checks: homepage 200, `/api/market` 200 with 4/4 feeds, `/history` 200. Health correctly reports Preview as degraded because writer secrets are not present there.
- **Not yet verified:** actual browser interaction / reload restoration, production Cron execution, and persistent rows. A server-rendered fetch cannot prove client-side storage behavior.


## Quality pass 13 — prove willingness to pay before building more

- **Added:** a generated seven-day validation plan based on the user's selected audience, pain point, and revenue model.
- The plan gives concrete work for review mining, customer interviews, a price-visible test, and recording meaningful actions (inquiries, reservations, paid pilots, actual payments) rather than relying on page views.
- Revenue-model guidance changes for B2B licensing, usage-based pricing, freemium, undecided pricing, and other paid models.
- The brief now exports the plan and an explicit continue/revise decision gate with the copy action.
- Thresholds are labelled as early-stage heuristics, not statistically proven demand or a promise of revenue.
- Added unit tests for plan structure, B2B price validation, and undecided pricing. CI now runs tests before production build and uses Node 22 to support the repository's native TypeScript test runner.
- **Verification:** latest branch head `f900eef0cf12b33b62673876a36ee724b8182f16` reached Vercel `READY`; GitHub Actions run [38176035358](https://github.com/shunai394-hash/app-trend/actions/runs/38176035358) passed Lint, Unit tests, and Build. Preview smoke checks returned HTTP 200 for `/`, `/api/market` (4/4 feeds), `/api/history` (zero historical rows), and `/history`. `/api/health` returned 503/degraded in Preview because writer secrets are intentionally not configured there.
- **Still blocked:** this is a local planning workflow, not actual review mining or measured willingness-to-pay data. No saved cloud workspaces, subscription checkout, global store data, or verified snapshot automation have been added by this pass.


## Quality pass 14 — make scheduled automation regression-testable

- **Added:** `scripts/check-cron-config.mjs` verifies that `vercel.json` contains exactly one `/api/cron/snapshot` job at `0 3 * * *` UTC and that the corresponding route exists.
- **CI change:** GitHub Actions now runs `npm run check:cron` between unit tests and build, so deleting or renaming the scheduled endpoint or changing its schedule unexpectedly fails quality checks.
- **Why this matters:** the daily snapshot is the foundation for future rank-velocity signals. A configured schedule alone is not evidence that the job executed or that rows were persisted.
- **Verification still pending for this commit:** wait for GitHub Actions and the new Vercel Preview deployment, then run endpoint smoke checks.
- **Operational blocker remains:** the latest Supabase inspection still reports zero rows in both `market_snapshot_runs` and `market_snapshots`. Vercel Cron runs only on Production deployments, not Preview deployments ([Vercel Cron quickstart](https://examples.vercel.com/docs/cron-jobs/quickstart)). The current branch's deployment target is Preview and PR #2 is still a draft; do not claim the automated data pipeline is live until a Production deployment is authorized and a successful stored run is observed.
- **Security follow-up:** Supabase still flags leaked-password protection as disabled. This needs an explicit Auth setting change and verification.
