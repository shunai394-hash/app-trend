"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Snapshot = {
  snapshot_day: string;
  country: "us" | "jp";
  chart: "top-free" | "top-paid";
  app_id: string;
  app_name: string;
  developer: string;
  app_url: string;
  artwork_url: string | null;
  genres: string[];
  rank: number;
};

type HistoryResponse = {
  status: string;
  message?: string;
  since?: string;
  days?: number;
  count?: number;
  snapshots: Snapshot[];
};

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [country, setCountry] = useState<"us" | "jp">("jp");
  const [chart, setChart] = useState<"top-free" | "top-paid">("top-free");
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ country, chart, days });
      const response = await fetch(`/api/history?${query}`, { cache: "no-store", signal });
      const payload = await response.json() as HistoryResponse;
      setData(payload);
      if (!response.ok) setError(payload.message ?? "履歴データを取得できませんでした。");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError("履歴データを取得できませんでした。時間をおいて再試行してください。");
    } finally {
      setLoading(false);
    }
  }, [country, chart, days]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const appRows = useMemo(() => {
    const snapshots = data?.snapshots ?? [];
    const byApp = new Map<string, Snapshot[]>();
    for (const snapshot of snapshots) {
      const key = snapshot.app_id;
      const existing = byApp.get(key) ?? [];
      existing.push(snapshot);
      byApp.set(key, existing);
    }
    return [...byApp.entries()].map(([id, records]) => {
      const ordered = [...records].sort((a, b) => a.snapshot_day.localeCompare(b.snapshot_day));
      const first = ordered[0];
      const latest = ordered[ordered.length - 1];
      const change = first.rank - latest.rank;
      return { id, first, latest, observations: ordered.length, change };
    }).sort((a, b) => b.change - a.change || a.latest.rank - b.latest.rank);
  }, [data]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <Link href="/" className="brand-mark">APP TREND <span>RESEARCH</span></Link>
        <span className="eyebrow">MARKET SIGNALS / HISTORY</span>
      </header>
      <section className="hero-block">
        <p className="eyebrow">EVIDENCE OVER ASSUMPTION</p>
        <h1>順位の一瞬ではなく、<br />変化を追う。</h1>
        <p className="hero-copy">日次スナップショットを蓄積し、初回観測と最新観測の順位差を比較します。ランキングはダウンロード数や売上を示すものではありません。</p>
      </section>
      <section className="filter-panel" aria-label="履歴の絞り込み">
        <label>市場<select value={country} onChange={(event) => setCountry(event.target.value as "us" | "jp")}><option value="jp">日本</option><option value="us">米国</option></select></label>
        <label>チャート<select value={chart} onChange={(event) => setChart(event.target.value as "top-free" | "top-paid")}><option value="top-free">無料</option><option value="top-paid">有料</option></select></label>
        <label>期間<select value={days} onChange={(event) => setDays(event.target.value)}><option value="7">7日</option><option value="30">30日</option><option value="90">90日</option></select></label>
        <button type="button" className="secondary-button" onClick={() => void load()}>再読み込み</button>
      </section>
      <section className="history-panel" aria-live="polite">
        <div className="section-heading"><div><p className="eyebrow">RANK MOVEMENT</p><h2>順位変動の観測</h2></div><span>{loading ? "取得中…" : `${data?.count ?? 0} observations`}</span></div>
        {error ? <div className="notice-panel"><strong>履歴ストレージを利用できません</strong><p>{error}</p><p>必要な設定：SUPABASE_URL、SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY、CRON_SECRET。DBマイグレーション適用後、日次記録が始まります。</p></div> :
          !loading && appRows.length === 0 ? <div className="notice-panel"><strong>まだ履歴がありません</strong><p>最初の定期取得が成功すると、ここに順位変動が表示されます。履歴は過去の値を推定して埋めません。</p></div> :
          <div className="table-scroll"><table className="history-table"><thead><tr><th>アプリ</th><th>初回順位</th><th>最新順位</th><th>順位差*</th><th>観測回数</th></tr></thead><tbody>
            {appRows.map((row) => <tr key={row.id}><td><a href={row.latest.app_url} target="_blank" rel="noreferrer">{row.latest.app_name}</a><small>{row.latest.developer} · {row.latest.genres.join(", ") || "ジャンル未確認"}</small></td><td>#{row.first.rank}<small>{row.first.snapshot_day}</small></td><td>#{row.latest.rank}<small>{row.latest.snapshot_day}</small></td><td><span className={row.change > 0 ? "history-up" : row.change < 0 ? "history-down" : "history-flat"}>{row.change > 0 ? `↑ ${row.change}` : row.change < 0 ? `↓ ${Math.abs(row.change)}` : "± 0"}</span></td><td>{row.observations}</td></tr>)}
          </tbody></table></div>}
        <p className="data-caveat">* 順位差 = 初回観測順位 − 最新観測順位。プラスは順位上昇を示します。初回観測は選択期間内であり、リリース日や需要の変化を直接示すものではありません。</p>
      </section>
      <footer className="page-footer"><Link href="/">← 市場ダッシュボードに戻る</Link><span>Source: Apple App Store Charts · Daily snapshots</span></footer>
    </main>
  );
}
