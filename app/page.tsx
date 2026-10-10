"use client";

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
type MarketResponse = {
  fetchedAt: string;
  successfulFeeds: number;
  totalFeeds: number;
  feeds: Feed[];
  limitations: string[];
};

const chartNames: Record<string, string> = { "top-free": "無料", "top-paid": "有料" };

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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  const feeds = data?.feeds ?? [];
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

  const availableCountries = country === "all" ? ["us", "jp"] : [country];
  const successfulVisible = visibleFeeds.filter((feed) => feed.status === "ok").length;
  const liveCount = visibleFeeds.reduce((sum, feed) => sum + feed.apps.length, 0);
  const hasAnyFeed = feeds.some((feed) => feed.status === "ok");

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
                        {app.artworkUrl ? <img className="app-artwork" src={app.artworkUrl} alt="" loading="lazy" width="42" height="42" /> : <span className="app-artwork app-artwork-fallback" aria-hidden="true">A</span>}
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

      <section className="method-section" id="method">
        <div className="method-copy"><p className="eyebrow">03 / TRANSPARENCY</p><h2>Fact first.<br /><em>Hypothesis second.</em></h2><p>このMVPは公開ランキングを観測するところから始めます。ランキングだけで「儲かるアプリ」を断定しません。レビュー・検索需要・競合の料金・顧客インタビューを組み合わせて、仮説の確度を上げていきます。</p></div>
        <div className="method-checklist">
          <div><span className="check-mark">01</span><p><strong>出典を表示</strong><small>ソースURLと取得チェック時刻を表示。各フィードの成功・失敗も分離。</small></p></div>
          <div><span className="check-mark">02</span><p><strong>事実と推測を分離</strong><small>ランキング掲載を収益や需要の証明として扱わない。</small></p></div>
          <div><span className="check-mark">03</span><p><strong>失敗を隠さない</strong><small>取得できない国・チャートはエラーとして表示し、ゼロ件と混同しない。</small></p></div>
        </div>
      </section>

      <footer className="footer"><a className="footer-brand" href="#top">↗ app trend</a><span>Early access · Live public chart data</span><span>© App Trend · Evidence before assumptions.</span></footer>
    </main>
  );
}
