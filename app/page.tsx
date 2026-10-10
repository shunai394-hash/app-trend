"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type AppItem = {
  id: string;
  rank: number;
  name: string;
  developer: string;
  url: string;
  artworkUrl: string | null;
  genres: string[];
};
type Feed = {
  country: string;
  countryLabel: string;
  chart: string;
  chartLabel: string;
  sourceUrl: string;
  sourceUpdatedAt: string | null;
  status: "ok" | "error";
  error?: string;
  apps: AppItem[];
};
const EMPTY_FEEDS: Feed[] = [];

type MarketResponse = {
  fetchedAt: string;
  successfulFeeds: number;
  totalFeeds: number;
  feeds: Feed[];
  limitations: string[];
};

function formatTime(value: string | null | undefined) {
  if (!value) return "取得日時なし";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo",
  }).format(date);
}

export default function HomePage() {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [country, setCountry] = useState("all");
  const [chart, setChart] = useState("top-free");
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [hypothesisCategory, setHypothesisCategory] = useState("");
  const [hypothesisTarget, setHypothesisTarget] = useState("");
  const [hypothesisProblem, setHypothesisProblem] = useState("");
  const [hypothesisPrice, setHypothesisPrice] = useState("月額サブスクリプション");
  const [hypothesisError, setHypothesisError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [hypothesisBrief, setHypothesisBrief] = useState<null | {
    category: string; target: string; problem: string; price: string;
    observation: string; sources: { label: string; url: string; updatedAt: string | null }[];
    createdAt: string;
  }>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/market", { cache: "no-store", signal });
      const payload = await response.json() as MarketResponse;
      if (!response.ok && !payload.feeds?.length) throw new Error("市場データを取得できませんでした。時間をおいて再試行してください。");
      setData(payload);
      if (payload.successfulFeeds === 0) setError("すべてのデータソースに接続できませんでした。");
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "予期しないエラーが発生しました。");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  const feeds = data?.feeds ?? EMPTY_FEEDS;
  const visibleFeeds = useMemo(() => feeds.filter((feed) =>
    (country === "all" || feed.country === country) && feed.chart === chart
  ), [feeds, country, chart]);

  const visibleApps = useMemo(() => visibleFeeds.flatMap((feed) =>
    feed.apps.filter((app) => {
      const text = `${app.name} ${app.developer} ${app.genres.join(" ")}`.toLocaleLowerCase();
      return text.includes(query.trim().toLocaleLowerCase());
    }).map((app) => ({ ...app, country: feed.country, countryLabel: feed.countryLabel, chartLabel: feed.chartLabel, sourceUrl: feed.sourceUrl, sourceUpdatedAt: feed.sourceUpdatedAt, feedStatus: feed.status }))
  ), [visibleFeeds, query]);

  const genreSignals = useMemo(() => {
    const counts = new Map<string, number>();
    visibleApps.forEach((app) => app.genres.forEach((genre) => counts.set(genre, (counts.get(genre) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [visibleApps]);

  const crossMarketSignals = useMemo(() => {
    const usFeed = feeds.find((feed) => feed.country === "us" && feed.chart === chart && feed.status === "ok");
    const jpFeed = feeds.find((feed) => feed.country === "jp" && feed.chart === chart && feed.status === "ok");
    const usTotal = usFeed?.apps.length ?? 0;
    const jpTotal = jpFeed?.apps.length ?? 0;
    const counts = new Map<string, { us: number; jp: number }>();
    usFeed?.apps.forEach((app) => app.genres.forEach((genre) => {
      const item = counts.get(genre) ?? { us: 0, jp: 0 };
      item.us += 1;
      counts.set(genre, item);
    }));
    jpFeed?.apps.forEach((app) => app.genres.forEach((genre) => {
      const item = counts.get(genre) ?? { us: 0, jp: 0 };
      item.jp += 1;
      counts.set(genre, item);
    }));
    return [...counts.entries()].map(([genre, value]) => ({
      genre,
      ...value,
      usShare: usTotal ? value.us / usTotal * 100 : 0,
      jpShare: jpTotal ? value.jp / jpTotal * 100 : 0,
      delta: (usTotal ? value.us / usTotal * 100 : 0) - (jpTotal ? value.jp / jpTotal * 100 : 0),
    })).filter((item) => item.us > 0 || item.jp > 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);
  }, [feeds, chart]);

  const successfulVisible = visibleFeeds.filter((feed) => feed.status === "ok").length;
  const liveCount = visibleFeeds.reduce((sum, feed) => sum + feed.apps.length, 0);
  const hasAnyFeed = feeds.some((feed) => feed.status === "ok");

  const createHypothesisBrief = () => {
    const target = hypothesisTarget.trim();
    const problem = hypothesisProblem.trim();
    if (!hypothesisCategory || !target || !problem) {
      setHypothesisError("ジャンル・対象ユーザー・解決したい課題を入力してください。");
      setHypothesisBrief(null);
      return;
    }
    const signal = crossMarketSignals.find((item) => item.genre === hypothesisCategory);
    const sources = feeds
      .filter((feed) => feed.chart === chart && feed.status === "ok")
      .map((feed) => ({ label: `${feed.countryLabel} ${feed.chartLabel}ランキング`, url: feed.sourceUrl, updatedAt: feed.sourceUpdatedAt }));
    const observation = signal
      ? `取得できた${chart === "top-free" ? "無料" : "有料"}チャートでは、${signal.genre}カテゴリが米国 ${signal.us}件 / 日本 ${signal.jp}件。チャート内構成比の差は ${signal.delta > 0 ? "+" : ""}${signal.delta.toFixed(1)}ポイントです。`
      : "選択ジャンルの比較データが不足しています。チャートでの掲載状況を確認し、追加の根拠を集めてください。";
    setHypothesisBrief({ category: hypothesisCategory, target, problem, price: hypothesisPrice, observation, sources, createdAt: new Date().toISOString() });
    setHypothesisError("");
    setCopyMessage("");
  };

  const copyHypothesisBrief = async () => {
    if (!hypothesisBrief) return;
    const text = [
      "APP TREND — 仮説検証ブリーフ（未検証）",
      `ジャンル: ${hypothesisBrief.category}`,
      `対象ユーザー: ${hypothesisBrief.target}`,
      `解決したい課題: ${hypothesisBrief.problem}`,
      `想定収益モデル: ${hypothesisBrief.price}`,
      `観測データ: ${hypothesisBrief.observation}`,
      "検証案: 対象ユーザー5〜10人に課題の頻度・現在の代替手段・支払い意思を聞き、簡易LPまたは手動サービスで実際の登録/予約行動を測定する。",
      "注意: App Storeの掲載順位はダウンロード数・売上・利益の証拠ではありません。このブリーフは仮説であり、成功を保証しません。",
      "データソース:",
      ...hypothesisBrief.sources.map((source) => `${source.label}: ${source.url} (ソース更新: ${formatTime(source.updatedAt)})`),
      `作成時刻: ${formatTime(hypothesisBrief.createdAt)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("ブリーフをコピーしました。");
    } catch {
      setCopyMessage("自動コピーできませんでした。下のブリーフ本文を選択してコピーしてください。");
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="App Trend ホーム">
          <span className="brand-symbol" aria-hidden="true">↗</span>
          <span><strong>app trend</strong><small>FIND WHAT TO BUILD NEXT</small></span>
        </a>
        <nav className="topnav" aria-label="ページ内ナビゲーション">
          <a className="nav-current" href="#radar">Market radar</a>
          <a href="#signals">Signals</a>
          <a href="#method">Methodology</a>
        </nav>
        <span className={hasAnyFeed ? "status-pill is-live" : "status-pill"}>
          <span className="status-dot" />{hasAnyFeed ? "LIVE SOURCE" : "SOURCE CHECK"}
        </span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> MARKET INTELLIGENCE / EARLY ACCESS</p>
          <h1>次に作るアプリを、<br /><em>勘ではなく根拠から。</em></h1>
          <p className="hero-lede">米国と日本のApp Storeチャートを同じ視点で比較。市場で見つかる事実と、これから検証すべき仮説を分けて、次の一手を考えます。</p>
          <div className="hero-proof"><span>01 / Public chart data</span><span>02 / US × Japan</span><span>03 / Evidence first</span></div>
        </div>
        <div className="hero-card">
          <div className="hero-card-top"><span>DATA COVERAGE</span><span className="mini-pulse" /></div>
          <div className="coverage-number">{data ? `${data.successfulFeeds}/${data.totalFeeds}` : "—/4"}</div>
          <p>接続中のチャートソース</p>
          <div className="coverage-rule"><span style={{ width: data ? `${data.successfulFeeds / Math.max(1, data.totalFeeds) * 100}%` : "0%" }} /></div>
          <div className="coverage-foot"><span>米国 · 日本</span><span>無料 · 有料</span></div>
        </div>
      </section>

      <section className="trust-note" aria-label="データの注意事項">
        <span className="trust-icon" aria-hidden="true">i</span>
        <p><strong>データの範囲を明示しています。</strong> チャート順位は公開ランキングの観測値です。ダウンロード数・売上・利益を示すものではなく、成功を保証しません。</p>
      </section>

      <section className="radar-section" id="radar">
        <div className="section-heading">
          <div><p className="eyebrow">01 / OBSERVE</p><h2>Market radar</h2><p className="section-subtitle">いま公開されているランキングを、国とチャート別に確認。</p></div>
          <button className="refresh-button" onClick={() => setRefreshKey((n) => n + 1)} disabled={loading}><span aria-hidden="true">↻</span> {loading ? "取得中…" : "データを更新"}</button>
        </div>

        <div className="control-panel">
          <div className="control-group">
            <span className="control-label">MARKET</span>
            <div className="segmented" role="group" aria-label="国を選択">
              <button className={country === "all" ? "selected" : ""} onClick={() => setCountry("all")}>両市場</button>
              <button className={country === "us" ? "selected" : ""} onClick={() => setCountry("us")}>🇺🇸 米国</button>
              <button className={country === "jp" ? "selected" : ""} onClick={() => setCountry("jp")}>🇯🇵 日本</button>
            </div>
          </div>
          <div className="control-group">
            <span className="control-label">CHART TYPE</span>
            <div className="segmented" role="group" aria-label="チャート種別">
              <button className={chart === "top-free" ? "selected" : ""} onClick={() => setChart("top-free")}>無料ランキング</button>
              <button className={chart === "top-paid" ? "selected" : ""} onClick={() => setChart("top-paid")}>有料ランキング</button>
            </div>
          </div>
          <label className="search-control"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="アプリ名・開発元・カテゴリを検索" aria-label="アプリ名・開発元・カテゴリを検索" /><kbd>検索</kbd></label>
        </div>

        {error && <div className="error-banner" role="alert"><strong>データ取得に注意が必要です</strong><span>{error}</span><button onClick={() => setRefreshKey((n) => n + 1)}>再試行</button></div>}

        <div className="data-summary">
          <div><span className="summary-label">VISIBLE LISTINGS</span><strong>{visibleApps.length}</strong><span className="summary-caption">検索・フィルター適用後</span></div>
          <div><span className="summary-label">FEEDS AVAILABLE</span><strong>{successfulVisible}<small> / {visibleFeeds.length}</small></strong><span className="summary-caption">選択した条件のソース</span></div>
          <div><span className="summary-label">LAST CHECKED</span><strong className="summary-time">{formatTime(data?.fetchedAt)}</strong><span className="summary-caption">取得チェック時刻 · JST</span></div>
        </div>

        <div className="feed-grid">
          {visibleFeeds.map((feed) => (
            <section className="feed-card" key={feed.country + feed.chart} aria-label={feed.countryLabel + " " + feed.chartLabel + "ランキング"}>
              <div className="feed-heading">
                <div className="feed-market"><span className="country-mark">{feed.country === "us" ? "US" : "JP"}</span><div><h3>{feed.countryLabel} <span>{feed.chartLabel}ランキング</span></h3><p>Apple App Store · Top 25</p></div></div>
                <span className={feed.status === "ok" ? "feed-status good" : "feed-status bad"}>{feed.status === "ok" ? "取得済み" : "取得失敗"}</span>
              </div>
              {feed.status === "error" ? (
                <div className="feed-error"><strong>このソースを読み込めませんでした。</strong><p>{feed.error}</p><a href={feed.sourceUrl} target="_blank" rel="noreferrer">ソースを直接確認 ↗</a></div>
              ) : (
                <>
                  <div className="feed-meta"><span>{feed.apps.length} apps returned</span><span>Source update: {formatTime(feed.sourceUpdatedAt)}</span></div>
                  <ol className="app-list">
                    {feed.apps.filter((app) => {
                      const text = `${app.name} ${app.developer} ${app.genres.join(" ")}`.toLocaleLowerCase();
                      return text.includes(query.trim().toLocaleLowerCase());
                    }).map((app) => (
                      <li className="app-row" key={app.id}>
                        <span className="app-rank">{String(app.rank).padStart(2, "0")}</span>
                        {app.artworkUrl ? <Image className="app-artwork" src={app.artworkUrl} alt="" loading="lazy" width={42} height={42} unoptimized /> : <span className="app-artwork app-artwork-fallback" aria-hidden="true">A</span>}
                        <div className="app-info"><a href={app.url} target="_blank" rel="noreferrer">{app.name}<span aria-hidden="true"> ↗</span></a><span>{app.developer}</span><div className="genre-list">{app.genres.slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}</div></div>
                        <span className="rank-label">RANK</span>
                      </li>
                    ))}
                  </ol>
                  {feed.apps.filter((app) => {
                    const text = `${app.name} ${app.developer} ${app.genres.join(" ")}`.toLocaleLowerCase();
                    return text.includes(query.trim().toLocaleLowerCase());
                  }).length === 0 && <p className="no-results">一致するアプリはありません。</p>}
                  <a className="source-link" href={feed.sourceUrl} target="_blank" rel="noreferrer">データソースを開く <span aria-hidden="true">↗</span></a>
                </>
              )}
            </section>
          ))}
        </div>
        {!loading && visibleFeeds.length > 0 && liveCount === 0 && !error && <p className="empty-state">この条件のランキングはまだありません。国・チャートを切り替えてください。</p>}
        {loading && !data && <div className="loading-state"><span className="loading-orb" />Appleの公開チャートを取得しています…</div>}
      </section>

      <section className="signals-section" id="signals">
        <div className="section-heading">
          <div><p className="eyebrow">02 / INTERPRET CAREFULLY</p><h2>Signals, not promises.</h2><p className="section-subtitle">ランキングから見える分類の分布。これは市場規模や成長率ではなく、取得できた掲載アプリの単純集計です。</p></div>
        </div>
        <div className="signals-grid">
          <div className="signal-panel">
            <div className="panel-heading"><div><span className="panel-index">A</span><h3>掲載カテゴリの分布</h3></div><span className="count-badge">{visibleApps.length} listings</span></div>
            {genreSignals.length ? genreSignals.map(([genre, count], index) => (
              <div className="genre-bar-row" key={genre}><div className="genre-bar-label"><span>{String(index + 1).padStart(2, "0")} / {genre}</span><strong>{count}</strong></div><div className="genre-track"><span style={{ width: `${Math.max(5, count / Math.max(1, genreSignals[0][1]) * 100)}%` }} /></div></div>
            )) : <p className="empty-state compact">データを取得すると、掲載カテゴリの分布を表示します。</p>}
            <p className="panel-footnote">集計対象：選択中の国・チャート・検索条件。ジャンルの重複を含みます。</p>
          </div>
          <div className="signal-panel next-panel">
            <div className="panel-heading"><div><span className="panel-index">B</span><h3>次に検証すること</h3></div><span className="count-badge">RESEARCH PLAN</span></div>
            <ol className="research-steps">
              <li><span>01</span><div><strong>上位アプリのレビューを読む</strong><p>繰り返し出る不満・未解決の用途・支払う理由を探す。</p></div></li>
              <li><span>02</span><div><strong>米国と日本の差を確認する</strong><p>片方にしか見られないアプリやジャンルを候補にし、差の理由を追加調査する。</p></div></li>
              <li><span>03</span><div><strong>顧客に小さく検証する</strong><p>5〜10人への聞き取りや簡単なLPで、課題の強さと支払い意思を確認する。</p></div></li>
            </ol>
            <p className="panel-footnote">これらは調査手順の提案であり、自動的に需要を証明するものではありません。</p>
          </div>
        </div>
      </section>

      <section className="comparison-section" aria-labelledby="comparison-title">
        <div className="section-heading">
          <div><p className="eyebrow">02B / COMPARE MARKETS</p><h2 id="comparison-title">Different charts. Questions worth asking.</h2><p className="section-subtitle">カテゴリがランキング内で占める割合の差を表示します。市場規模・成長率・需要の差を意味するものではありません。</p></div>
        </div>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead><tr><th>ジャンル</th><th>米国 Top 25内</th><th>日本 Top 25内</th><th>構成比の差*</th><th>調査の問い</th></tr></thead>
            <tbody>
              {crossMarketSignals.map((item) => (
                <tr key={item.genre}>
                  <th scope="row">{item.genre}</th>
                  <td><span className="table-number">{item.us}</span><small>{item.usShare.toFixed(0)}%</small></td>
                  <td><span className="table-number">{item.jp}</span><small>{item.jpShare.toFixed(0)}%</small></td>
                  <td><span className={item.delta > 0 ? "delta-value us-delta" : item.delta < 0 ? "delta-value jp-delta" : "delta-value"}>{item.delta > 0 ? "+" : ""}{item.delta.toFixed(1)} pp</span></td>
                  <td className="question-cell">{item.delta > 0 ? "米国の上位掲載に多い理由は？" : item.delta < 0 ? "日本の上位掲載に多い理由は？" : "両市場で共通する用途は？"}</td>
                </tr>
              ))}
              {crossMarketSignals.length === 0 && <tr><td colSpan={5} className="empty-table">両市場のデータがそろうと比較できます。</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="comparison-disclaimer">* 構成比の差 = 取得できた上位チャート内の掲載数を、各チャートの取得件数で割った値の差。1アプリが複数ジャンルに含まれる場合があります。サンプル数が小さく、これだけで市場機会や収益性は判断できません。</p>
      </section>

      <section className="hypothesis-section" aria-labelledby="hypothesis-title">
        <div className="section-heading">
          <div><p className="eyebrow">03 / TURN SIGNALS INTO A TEST</p><h2 id="hypothesis-title">Build a testable hypothesis.</h2><p className="section-subtitle">ランキングの観測とあなたの顧客仮説を組み合わせ、次に行う検証を具体化します。AIの売上予測や需要の証明ではありません。</p></div>
        </div>
        <div className="hypothesis-workbench">
          <div className="hypothesis-form">
            <div className="workbench-label"><span>RESEARCH WORKBENCH</span><span>HYPOTHESIS / DRAFT</span></div>
            <label>調査するジャンル
              <select value={hypothesisCategory} onChange={(event) => setHypothesisCategory(event.target.value)} required>
                <option value="">ジャンルを選択</option>
                {[...new Set([...crossMarketSignals.map((item) => item.genre), ...genreSignals.map(([genre]) => genre)])].sort().map((genre) => <option value={genre} key={genre}>{genre}</option>)}
              </select>
            </label>
            <label>対象ユーザー
              <input value={hypothesisTarget} onChange={(event) => setHypothesisTarget(event.target.value)} placeholder="例：週3回以上オンライン販売を行う個人事業主" maxLength={140} required />
            </label>
            <label>解決したい課題
              <textarea value={hypothesisProblem} onChange={(event) => setHypothesisProblem(event.target.value)} placeholder="例：レビューを読む時間がなく、繰り返し発生する顧客の不満を見逃している" maxLength={500} rows={3} required />
            </label>
            <label>検討する収益モデル
              <select value={hypothesisPrice} onChange={(event) => setHypothesisPrice(event.target.value)}>
                <option>月額サブスクリプション</option><option>買い切り</option><option>従量課金</option><option>無料 + 有料機能</option><option>法人向けライセンス</option><option>未定・顧客調査で確認</option>
              </select>
            </label>
            {hypothesisError && <p className="form-error" role="alert">{hypothesisError}</p>}
            <button className="refresh-button workbench-submit" onClick={createHypothesisBrief}>検証ブリーフを作成 ↗</button>
            <p className="form-footnote">入力内容はこの画面内で処理します。現時点ではアカウントへの保存やクラウド同期はありません。</p>
          </div>
          <div className="hypothesis-output" aria-live="polite">
            {hypothesisBrief ? <>
              <div className="output-header"><span className="output-status">UNVALIDATED HYPOTHESIS</span><span className="output-date">{formatTime(hypothesisBrief.createdAt)}</span></div>
              <h3>{hypothesisBrief.category} · {hypothesisBrief.target}</h3>
              <p className="hypothesis-statement">仮説：<strong>{hypothesisBrief.target}</strong>は「{hypothesisBrief.problem}」という課題を解決できるなら、<strong>{hypothesisBrief.price}</strong>の{hypothesisBrief.category}関連アプリを試す可能性がある。</p>
              <div className="observation-box"><span>OBSERVED CHART DATA</span><p>{hypothesisBrief.observation}</p></div>
              <h4>次に行う検証</h4>
              <ol className="validation-list"><li>対象ユーザー5〜10人に、課題の頻度・現在の代替手段・支払い意思を聞く。</li><li>1つの具体的な解決策を示す簡易LPまたは手動サービスを用意する。</li><li>閲覧数ではなく、登録・予約・有料テストへの参加など実際の行動を測る。</li></ol>
              <div className="output-sources"><strong>参照した公開チャート</strong>{hypothesisBrief.sources.length ? hypothesisBrief.sources.map((source) => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.label} · ソース更新 {formatTime(source.updatedAt)} ↗</a>) : <span>参照できるソースがありません。市場データの取得状態を確認してください。</span>}</div>
              <p className="output-disclaimer">このブリーフは未検証の仮説です。ランキングだけでは顧客需要、売上、利益を判断できません。</p>
              <button className="copy-brief-button" onClick={copyHypothesisBrief}>ブリーフをコピー ↗</button>
              {copyMessage && <p className="copy-message" role="status">{copyMessage}</p>}
            </> : <div className="output-empty"><span className="output-empty-icon">↗</span><p className="eyebrow">YOUR NEXT EXPERIMENT</p><h3>観測を、検証できる問いに変える。</h3><p>ジャンルと対象ユーザー、解決したい課題を入力すると、参照元付きの調査ブリーフを作成します。</p><div className="empty-step"><span>01</span>課題の強さを確認する</div><div className="empty-step"><span>02</span>支払い意思を確認する</div><div className="empty-step"><span>03</span>小さな実験で判断する</div></div>}
          </div>
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="method-copy"><p className="eyebrow">03 / TRANSPARENCY</p><h2>Fact first.<br /><em>Hypothesis second.</em></h2><p>このMVPは公開ランキングを観測するところから始めます。ランキングだけで「儲かるアプリ」を断定しません。レビュー・検索需要・競合の料金・顧客インタビューを組み合わせて、仮説の確度を上げていきます。</p></div>
        <div className="method-checklist">
          <div><span className="check-mark">01</span><p><strong>出典を表示</strong><small>ソースURLと取得チェック時刻を表示。各フィードの成功・失敗も分離。</small></p></div>
          <div><span className="check-mark">02</span><p><strong>事実と推測を分離</strong><small>ランキング掲載を収益や需要の証明として扱わない。</small></p></div>
          <div><span className="check-mark">03</span><p><strong>失敗を隠さない</strong><small>取得できない国・チャートはエラーとして表示し、ゼロ件と混同しない。</small></p></div>
        </div>
      </section>

      <footer className="footer"><a className="footer-brand" href="#top">↗ app trend</a><span>Early access · Live public chart data</span><span className="footer-right"><a href="/privacy">プライバシー</a><span>© App Trend · Evidence before assumptions.</span></span></footer>
    </main>
  );
}
