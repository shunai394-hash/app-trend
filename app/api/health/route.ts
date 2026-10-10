import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "app-trend",
    version: "0.2.0",
    checkedAt: new Date().toISOString(),
    checks: {
      application: "ok",
      marketSources: "checked by GET /api/market",
      persistence: "not configured",
      historicalSnapshots: "not configured",
    },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
