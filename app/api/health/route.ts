import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "app-trend",
    version: "0.3.0",
    checkedAt: new Date().toISOString(),
    checks: {
      application: "ok",
      marketSources: "checked by GET /api/market",
      historicalStorageEnvironment: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) && (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ? "configured" : "missing",
      snapshotWriterEnvironment: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.CRON_SECRET ? "configured" : "missing",
      snapshotSchedule: "daily at 03:00 UTC; verify Vercel Cron availability for the deployed plan",
      migration: "apply supabase/migrations/20261011000000_market_snapshots.sql before enabling history",
    },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
