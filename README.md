# App Trend

**Purpose:** help builders decide what app idea to validate next by separating observed market evidence from hypotheses. App Trend does not claim to predict revenue or guarantee success.

## Current implementation

- Next.js App Router application (TypeScript, responsive UI).
- Server route `GET /api/market` retrieves four public Apple App Store charts:
  - United States — Top Free / Top Paid
  - Japan — Top Free / Top Paid
- Each feed reports source URL, response generation time, source update time when available, per-source success/failure, rank, app name, developer, store link, artwork, and genre coverage.
- Genre fields missing from Apple RSS are enriched using a batched iTunes Lookup request per country; the UI shows genre coverage and links to both data sources.
- The manual refresh action bypasses the upstream fetch cache; normal requests use a 15-minute source cache.
- Partial source failures remain visible; one failed market does not hide successful feeds.
- Cache/revalidation target: 15 minutes.
- Search and market/chart filters operate in the browser.
- Installable web manifest, scalable icon, and a draft privacy disclosure page are included.
- The existing `index.html` remains as a static fallback/design reference; the Next.js `app/` route is the intended application entry point.

## Run locally

Requirements: Node.js 20.9+.

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production build:

```bash
npm run build
npm start
```

## Data and interpretation rules

1. App Store chart position is an observation, not a download count, revenue figure, profit estimate, or proof of customer demand.
2. Do not label a candidate as “profitable” based on chart rank alone.
3. Preserve source URL, source update timestamp when supplied, and local retrieval-check timestamp.
4. A failed feed must be marked as unavailable, not rendered as an empty market.
5. Ideas inferred from chart/category differences must be labeled as hypotheses and validated against reviews, search demand, competitors, pricing, and customer interviews.
6. Respect source terms and usage limits before production-scale collection. The current implementation reads Apple Marketing Tools RSS charts and enriches genres with the public iTunes Lookup endpoint; it links back to both sources and App Store listings.

## Known gaps — not ready for store submission

- CI has passed lint and production build on an earlier commit; rerun it on the latest genre-enrichment and refresh-cache changes before merging.
- There is no persistent historical chart database yet, so the product cannot reliably calculate growth velocity or historical rank changes.
- There is no review-mining pipeline, keyword-demand source, competitor pricing dataset, or validated willingness-to-pay evidence.
- No account, cloud-synced watchlist, billing, or user export flow.
- A web manifest does not by itself create an App Store / Google Play native app package. Native packaging, icons/screenshots, store metadata, privacy declarations, signing, device tests, and store review remain separate work.
- The privacy page is a draft; verify the deployed host's logging, retention, analytics, operator contact, and legal requirements before public launch.
- No real-world market data is included in source files; runtime feed results are fetched from Apple when the app is running.

## Release checklist

- [ ] Install dependencies and run a clean production build.
- [ ] Verify all four feed endpoints, one-feed outage, all-feed outage, malformed response, timeout, and cache behavior.
- [ ] Add automated tests for rank parsing, partial failures, and data freshness.
- [ ] Test mobile/desktop keyboard access and screen readers.
- [ ] Confirm image source policy, rate limits, terms, privacy statement, and hosting logs.
- [ ] Add historical snapshots and a transparent change-detection model.
- [ ] Expand the hypothesis workflow with review, keyword-demand, competitor pricing, and willingness-to-pay evidence; current briefs use chart observations plus user-entered assumptions.
- [ ] Decide web-only vs iOS/Android release target before native packaging.
