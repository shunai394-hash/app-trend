import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 900;

type AppleGenre = { genreId?: string; name?: string; url?: string };
type AppleApp = {
  id: string;
  name: string;
  artistName: string;
  url: string;
  artworkUrl100?: string;
  genres?: AppleGenre[];
};
type AppleFeed = {
  feed?: { title?: string; updated?: string; results?: AppleApp[] };
};

const SOURCES = [
  { country: "us", countryLabel: "米国", chart: "top-free", chartLabel: "無料", url: "https://rss.marketingtools.apple.com/api/v2/us/apps/top-free/25/apps.json" },
  { country: "us", countryLabel: "米国", chart: "top-paid", chartLabel: "有料", url: "https://rss.marketingtools.apple.com/api/v2/us/apps/top-paid/25/apps.json" },
  { country: "jp", countryLabel: "日本", chart: "top-free", chartLabel: "無料", url: "https://rss.marketingtools.apple.com/api/v2/jp/apps/top-free/25/apps.json" },
  { country: "jp", countryLabel: "日本", chart: "top-paid", chartLabel: "有料", url: "https://rss.marketingtools.apple.com/api/v2/jp/apps/top-paid/25/apps.json" },
] as const;

export async function GET() {
  const fetchedAt = new Date().toISOString();
  const settled = await Promise.all(SOURCES.map(async (source) => {
    try {
      const response = await fetch(source.url, {
        headers: { accept: "application/json" },
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Apple feed returned HTTP ${response.status}`);
      const payload = await response.json() as AppleFeed;
      const apps = payload.feed?.results;
      if (!Array.isArray(apps)) throw new Error("Feed format was not recognized");
      return {
        ...source,
        sourceUrl: source.url,
        sourceUpdatedAt: payload.feed?.updated ?? null,
        status: "ok" as const,
        apps: apps.map((app, index) => ({
          id: String(app.id),
          rank: index + 1,
          name: app.name,
          developer: app.artistName,
          url: app.url,
          artworkUrl: app.artworkUrl100 ?? null,
          genres: (app.genres ?? []).map((genre) => genre.name).filter((name): name is string => Boolean(name)),
        })),
      };
    } catch (error) {
      return {
        ...source,
        sourceUrl: source.url,
        sourceUpdatedAt: null,
        status: "error" as const,
        error: error instanceof Error ? error.message : "Unknown source error",
        apps: [],
      };
    }
  }));

  const successfulFeeds = settled.filter((feed) => feed.status === "ok").length;
  return NextResponse.json({
    product: "App Trend",
    dataMode: "live-public-chart",
    fetchedAt,
    refreshIntervalSeconds: 900,
    successfulFeeds,
    totalFeeds: SOURCES.length,
    feeds: settled,
    limitations: [
      "ランキングはApp Storeのチャートであり、ダウンロード数・売上額・利益を示すものではありません。",
      "無料・有料チャートの掲載順位は、将来の需要や事業成功を保証しません。",
      "一部の国・チャートが取得できない場合は、その状態を個別に表示します。",
    ],
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
    status: successfulFeeds === 0 ? 503 : 200,
  });
}
