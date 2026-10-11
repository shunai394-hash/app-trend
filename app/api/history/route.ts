import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({
      status: "not_configured",
      message: "Historical data is not configured yet.",
      requiredEnvironment: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
      snapshots: [],
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const params = new URL(request.url).searchParams;
  const country = params.get("country");
  const chart = params.get("chart");
  const daysRaw = Number(params.get("days") ?? "30");
  const days = Number.isFinite(daysRaw) ? Math.min(90, Math.max(1, Math.floor(daysRaw))) : 30;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const query = new URLSearchParams({
    select: "snapshot_day,captured_at,country,chart,app_id,app_name,developer,app_url,artwork_url,genres,rank,source_updated_at",
    snapshot_day: `gte.${since}`,
    order: "snapshot_day.desc,rank.asc",
    limit: "5000",
  });
  if (country === "us" || country === "jp") query.set("country", `eq.${country}`);
  if (chart === "top-free" || chart === "top-paid") query.set("chart", `eq.${chart}`);

  try {
    const upstream = await fetch(`${url.replace(/\/$/, "")}/rest/v1/market_snapshots?${query}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return NextResponse.json({
        status: "storage_error",
        message: "Historical storage is not ready. Apply the database migration and check read permissions.",
        snapshots: [],
      }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const snapshots = await upstream.json();
    return NextResponse.json({
      status: "ok",
      since,
      days,
      count: Array.isArray(snapshots) ? snapshots.length : 0,
      snapshots,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      status: "storage_error",
      message: "Historical storage could not be reached.",
      snapshots: [],
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
