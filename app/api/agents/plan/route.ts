import { NextRequest, NextResponse } from "next/server";
import { buildAgentPlannerMessages, parseAgentPlan, validateGoal } from "@/app/lib/agent-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BODY_BYTES = 12_000;
const REQUEST_TIMEOUT_MS = 22_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;
const requestWindow = new Map<string, { count: number; resetAt: number }>();

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function allowRequest(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  for (const [ip, entry] of requestWindow) {
    if (entry.resetAt <= now) requestWindow.delete(ip);
  }
  const current = requestWindow.get(key);
  if (!current || current.resetAt <= now) {
    requestWindow.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("許可されていないリクエスト元です。", 403);
  if (!allowRequest(request)) return jsonError("リクエストが多すぎます。10分ほど待ってから再試行してください。", 429);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return jsonError("入力サイズが上限を超えています。", 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("JSON形式のリクエストが必要です。", 400);
  }
  const goal = validateGoal(
    typeof body === "object" && body !== null && "goal" in body
      ? (body as { goal?: unknown }).goal
      : undefined,
  );
  if (!goal) return jsonError("目標は8〜2,000文字で入力してください。", 400);

  if (process.env.AGENT_RUNTIME_ENABLED !== "true") {
    return jsonError("AI実行はまだ有効化されていません。サーバー側のプロバイダー設定と利用上限の確認が必要です。", 503);
  }

  const apiKey = process.env.AGENT_PROVIDER_API_KEY;
  const baseUrl = process.env.AGENT_PROVIDER_BASE_URL?.replace(/\/$/, "");
  const model = process.env.AGENT_PROVIDER_MODEL;
  if (!apiKey || !baseUrl || !model) {
    return jsonError("AIプロバイダーのサーバー設定が不足しています。", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: buildAgentPlannerMessages(goal),
        temperature: 0.2,
        max_tokens: 1800,
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      // Never return provider response bodies or credential-related diagnostics to clients.
      return jsonError(response.status === 429 ? "AIプロバイダーが混雑しています。時間をおいて再試行してください。" : "AI計画の生成に失敗しました。設定とプロバイダーの状態を確認してください。", response.status === 429 ? 429 : 502);
    }

    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("choices" in payload) || !Array.isArray((payload as { choices?: unknown }).choices)) {
      return jsonError("AIプロバイダーから想定外の応答が返りました。", 502);
    }
    const first = (payload as { choices: Array<{ message?: { content?: unknown } }> }).choices[0];
    const content = first?.message?.content;
    if (typeof content !== "string" || content.length > 20_000) {
      return jsonError("AI計画の形式を検証できませんでした。", 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return jsonError("AI計画が有効なJSONではありません。再試行してください。", 502);
    }
    const plan = parseAgentPlan(goal, parsed);
    if (!plan) return jsonError("AI計画が品質基準を満たしませんでした。目標を具体化して再試行してください。", 502);

    return NextResponse.json({
      status: "draft",
      generatedAt: new Date().toISOString(),
      providerModel: model,
      executionStarted: false,
      plan,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return jsonError(timedOut ? "AI計画の生成がタイムアウトしました。" : "AI計画サービスに接続できませんでした。", 502);
  } finally {
    clearTimeout(timeout);
  }
}
