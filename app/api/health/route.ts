import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

type SnapshotRun = {
  snapshot_day: string;
  captured_at: string;
  status: "ok" | "error";
  app_count: number;
  error_message: string | null;
};

const MAX_SNAPSHOT_AGE_MS = 36 * 60 * 60 * 1000;

export async function GET() {
  const checkedAt = new Date();
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronConfigured = Boolean(process.env.CRON_SECRET);
  const checks: Record<string, unknown> = {
    application: "ok",
    snapshotWriterEnvironment: supabaseUrl && serviceKey && cronConfigured ? "configured" : "missing",
    snapshotSchedule: "daily at 03:00 UTC; execution is verified from stored run records",
    migration: "expected tables: market_snapshot_runs and market_snapshots",
    database: "not_checked",
    latestSnapshot: "not_checked",
  };
  let status: "ok" | "degraded" = "ok";
  let latestSnapshot: SnapshotRun | null = null;
  let databaseError: string | undefined;

  if (!supabaseUrl || !serviceKey || !cronConfigured) {
    status = "degraded";
    checks.database = "not_checked_missing_environment";
    checks.latestSnapshot = "unavailable";
  } else {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/market_snapshot_runs?select=snapshot_day,captured_at,status,app_count,error_message&order=captured_at.desc&limit=1`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) {
        throw new Error(`Storage query returned HTTP ${response.status}`);
      }

      const rows = await response.json() as SnapshotRun[];
      checks.database = "connected";
      latestSnapshot = Array.isArray(rows) ? rows[0] ?? null : null;

      if (!latestSnapshot) {
        status = "degraded";
        checks.latestSnapshot = "no_runs_recorded";
      } else {
        const capturedAt = new Date(latestSnapshot.captured_at).getTime();
        const ageMs = checkedAt.getTime() - capturedAt;
        const recent = Number.isFinite(capturedAt) && ageMs >= 0 && ageMs <= MAX_SNAPSHOT_AGE_MS;
        const healthy = recent && latestSnapshot.status === "ok" && latestSnapshot.app_count > 0;
        checks.latestSnapshot = healthy ? "fresh_and_successful" : "stale_or_failed";
        checks.latestSnapshotAgeHours = Number.isFinite(ageMs) ? Math.round(ageMs / 3_600_000 * 10) / 10 : null;
        if (!healthy) status = "degraded";
      }
    } catch (error) {
      status = "degraded";
      checks.database = "unavailable";
      checks.latestSnapshot = "unavailable";
      databaseError = error instanceof Error ? error.message : "Unknown storage error";
    }
  }

  return NextResponse.json({
    status,
    service: "app-trend",
    version: "0.4.0",
    checkedAt: checkedAt.toISOString(),
    checks,
    ...(latestSnapshot ? {
      latestSnapshot: {
        snapshotDay: latestSnapshot.snapshot_day,
        capturedAt: latestSnapshot.captured_at,
        status: latestSnapshot.status,
        appCount: latestSnapshot.app_count,
        error: latestSnapshot.error_message,
      },
    } : {}),
    ...(databaseError ? { diagnostic: databaseError } : {}),
  }, {
    status: status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
