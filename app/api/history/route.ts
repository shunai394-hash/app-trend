import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const captureConfigured = Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.CRON_SECRET
  );

  if (!url || !anonKey) {
    return json({
      status: "not_configured",
      message: "履歴の読み取り設定が未完了です。管理者は Supabase の URL と公開用キーを確認してください。",
      captureConfigured,
      runsStatus: "unavailable",
      runs: [],
      snapshots: [],
    }, 503);
  }

  const params = new URL(request.url).searchParams;
  const country = params.get("country");
  const chart = params.get("chart");
  const daysRaw = Number(params.get("days") ?? "30");
  const days = Number.isFinite(daysRaw)
    ? Math.min(90, Math.max(1, Math.floor(daysRaw)))
    : 30;
  const since = new Date(Date.now() - days * 86400000)
    .toISOString()
    .slice(0, 10);
  const baseUrl = url.replace(/\/$/, "");
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };

  const snapshotQuery = new URLSearchParams({
    select: "snapshot_day,captured_at,country,chart,app_id,app_name,developer,app_url,artwork_url,genres,rank,source_updated_at",
    snapshot_day: `gte.${since}`,
    order: "snapshot_day.desc,rank.asc",
    limit: "5000",
  });

  const runQuery = new URLSearchParams({
    select: "snapshot_day,country,chart,captured_at,status,app_count,error_message,source_updated_at",
    snapshot_day: `gte.${since}`,
    order: "snapshot_day.desc,captured_at.desc",
    limit: "100",
  });

  if (country === "us" || country === "jp") {
    snapshotQuery.set("country", `eq.${country}`);
    runQuery.set("country", `eq.${country}`);
  }

  if (chart === "top-free" || chart === "top-paid") {
    snapshotQuery.set("chart", `eq.${chart}`);
    runQuery.set("chart", `eq.${chart}`);
  }

  try {
    const snapshotResponse = await fetch(
      `${baseUrl}/rest/v1/market_snapshots?${snapshotQuery}`,
      {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!snapshotResponse.ok) {
      return json({
        status: "storage_error",
        message: "ランキング履歴を読み取れません。DBマイグレーションと読み取り権限を確認してください。",
        captureConfigured,
        runsStatus: "unavailable",
        runs: [],
        snapshots: [],
      }, 503);
    }

    const snapshots: unknown = await snapshotResponse.json();

    // 取得ログが未作成・未適用でも、ランキング履歴の読み取りは維持する。
    let runs: unknown[] = [];
    let runsStatus: "ok" | "unavailable" = "ok";

    try {
      const runResponse = await fetch(
        `${baseUrl}/rest/v1/market_snapshot_runs?${runQuery}`,
        {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }
      );

      if (runResponse.ok) {
        const payload: unknown = await runResponse.json();
        runs = Array.isArray(payload) ? payload : [];
      } else {
        runsStatus = "unavailable";
      }
    } catch {
      runsStatus = "unavailable";
    }

    return json({
      status: "ok",
      since,
      days,
      count: Array.isArray(snapshots) ? snapshots.length : 0,
      captureConfigured,
      runsStatus,
      runs,
      snapshots: Array.isArray(snapshots) ? snapshots : [],
    });
  } catch {
    return json({
      status: "storage_error",
      message: "ランキング履歴の保存先に接続できません。時間をおいて再試行してください。",
      captureConfigured,
      runsStatus: "unavailable",
      runs: [],
      snapshots: [],
    }, 503);
  }
}