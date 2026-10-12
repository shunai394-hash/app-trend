import { NextResponse } from "next/server";
import { canonicalizeGenres } from "../../../lib/genres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCES = [
  { country: "us", chart: "top-free", url: "https://rss.marketingtools.apple.com/api/v2/us/apps/top-free/25/apps.json" },
  { country: "us", chart: "top-paid", url: "https://rss.marketingtools.apple.com/api/v2/us/apps/top-paid/25/apps.json" },
  { country: "jp", chart: "top-free", url: "https://rss.marketingtools.apple.com/api/v2/jp/apps/top-free/25/apps.json" },
  { country: "jp", chart: "top-paid", url: "https://rss.marketingtools.apple.com/api/v2/jp/apps/top-paid/25/apps.json" },
] as const;

type FeedApp = { id: string; name: string; artistName: string; url: string; artworkUrl100?: string; genres?: Array<{ name?: string }> };
type FeedPayload = { feed?: { updated?: string; results?: FeedApp[] } };

function response(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function fetchAppleSnapshot(url: string) {
  // Retry one transient timeout/network/5xx failure. For 429, respect a short
  // Retry-After window; do not hammer a source that asks for a longer cooldown.
  try {
    const first = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (first.status === 429) {
      const retryAfter = first.headers.get("retry-after");
      const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN;
      const retryAfterDate = retryAfter && !Number.isFinite(retryAfterSeconds)
        ? Date.parse(retryAfter)
        : Number.NaN;
      const delayMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : Number.isFinite(retryAfterDate)
          ? retryAfterDate - Date.now()
          : 500;

      if (delayMs < 0 || delayMs > 1500) return first;
      await new Promise((resolve) => setTimeout(resolve, Math.max(250, delayMs)));
    } else if (first.status < 500) {
      return first;
    }
  } catch {
    // One bounded retry below; a failing source must not block the other three.
  }

  return fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return response(401, { error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return response(503, {
      error: "Historical storage is not configured.",
      requiredEnvironment: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET"],
    });
  }

  const capturedAt = new Date();
  const snapshotDay = capturedAt.toISOString().slice(0, 10);
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
  const results = await Promise.all(SOURCES.map(async (source) => {
    let status: "ok" | "error" = "error";
    let sourceUpdatedAt: string | null = null;
    let apps: FeedApp[] = [];
    let errorMessage: string | null = null;
    try {
      const upstream = await fetchAppleSnapshot(source.url);
      if (!upstream.ok) throw new Error(`Apple feed HTTP ${upstream.status}`);
      const payload = await upstream.json() as FeedPayload;
      if (!Array.isArray(payload.feed?.results) || payload.feed.results.length === 0) throw new Error("Apple feed was empty or had an unexpected format");
      apps = payload.feed.results;
      sourceUpdatedAt = payload.feed?.updated ?? null;
      status = "ok";
    } catch (error) {
      errorMessage = error instanceof Error ? error.message.slice(0, 400) : "Unknown source error";
    }

    const rows = apps.map((app, index) => ({
      snapshot_day: snapshotDay,
      captured_at: capturedAt.toISOString(),
      country: source.country,
      chart: source.chart,
      app_id: String(app.id),
      app_name: app.name,
      developer: app.artistName,
      app_url: app.url,
      artwork_url: app.artworkUrl100 ?? null,
      genres: canonicalizeGenres((app.genres ?? []).map((genre) => genre.name).filter((name): name is string => Boolean(name))).labels,
      rank: index + 1,
      source_updated_at: sourceUpdatedAt,
    }));

    // Upsert only observed entries. An unavailable feed is recorded as an error;
    // it is never represented as an empty market or a zero-demand observation.
    if (rows.length) {
      const saveRows = await fetch(
        `${supabaseUrl.replace(/\/$/, "")}/rest/v1/market_snapshots?on_conflict=snapshot_day,country,chart,app_id`,
        { method: "POST", headers, body: JSON.stringify(rows), signal: AbortSignal.timeout(12000) },
      );
      if (!saveRows.ok) {
        status = "error";
        errorMessage = `Snapshot write failed (HTTP ${saveRows.status})`;
      }
    }

    const runRow = {
      snapshot_day: snapshotDay,
      country: source.country,
      chart: source.chart,
      source_url: source.url,
      source_updated_at: sourceUpdatedAt,
      captured_at: capturedAt.toISOString(),
      status,
      app_count: status === "ok" ? apps.length : 0,
      error_message: errorMessage,
    };
    const saveRun = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/market_snapshot_runs?on_conflict=snapshot_day,country,chart`,
      { method: "POST", headers, body: JSON.stringify(runRow), signal: AbortSignal.timeout(12000) },
    );
    if (!saveRun.ok) {
      return { country: source.country, chart: source.chart, status: "error", appsStored: 0, error: `Run metadata write failed (HTTP ${saveRun.status})` };
    }
    return { country: source.country, chart: source.chart, status, appsStored: status === "ok" ? apps.length : 0, error: errorMessage };
  }));

  const successfulFeeds = results.filter((item) => item.status === "ok").length;
  return response(successfulFeeds === 0 ? 503 : 200, {
    snapshotDay,
    capturedAt: capturedAt.toISOString(),
    successfulFeeds,
    totalFeeds: 4,
    snapshotsWritten: results.reduce((sum, item) => sum + item.appsStored, 0),
    feeds: results,
    note: "A daily chart snapshot records observed ranks, not downloads, revenue, or profit.",
  });
}
