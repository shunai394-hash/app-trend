import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      let response = await fetch(source.url, {
        headers: { accept: "application/json" },
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(7000),
      });
      // Retry transient upstream 5xx once without using the cached error response.
      if (response.status >= 500) {
        response = await fetch(source.url, {
          headers: { accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(1500),
        });
      }
      if (!response.ok) throw new Error(`Apple feed returned HTTP ${response.status}`);
      const payload = await response.json() as AppleFeed;
      const apps = payload.feed?.results;
      if (!Array.isArray(apps) || apps.length === 0) throw new Error("Feed format was empty or not recognized");
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

  // Apple RSS omits genre metadata for a material share of chart entries.
  // Enrich missing categories with one batched iTunes Lookup request per country.
  const genreLookups = await Promise.all(["us", "jp"].map(async (country) => {
    const countryFeeds = settled.filter((feed) => feed.country === country && feed.status === "ok");
    const ids = [...new Set(countryFeeds.flatMap((feed) => feed.apps.map((app) => app.id)))];
    const url = ids.length
      ? `https://itunes.apple.com/lookup?country=${country}&id=${ids.join(",")}`
      : null;
    if (!url) return { country, url, status: "skipped" as const, genresById: new Map<string, string[]>() };
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error(`iTunes Lookup returned HTTP ${response.status}`);
      const payload = await response.json() as {
        results?: Array<{ trackId?: number; genres?: string[]; primaryGenreName?: string }>;
      };
      const genresById = new Map<string, string[]>();
      (payload.results ?? []).forEach((item) => {
        if (item.trackId === undefined) return;
        const genres = [...new Set([...(item.genres ?? []), ...(item.primaryGenreName ? [item.primaryGenreName] : [])])];
        genresById.set(String(item.trackId), genres);
      });
      return { country, url, status: "ok" as const, genresById };
    } catch {
      return { country, url, status: "error" as const, genresById: new Map<string, string[]>() };
    }
  }));

  const feedsWithGenreCoverage = settled.map((feed) => {
    const lookup = genreLookups.find((item) => item.country === feed.country);
    const apps = feed.apps.map((app) => ({
      ...app,
      genres: [...new Set([...app.genres, ...(lookup?.genresById.get(app.id) ?? [])])],
    }));
    return {
      ...feed,
      genreLookupUrl: lookup?.url ?? null,
      genreLookupStatus: lookup?.status ?? "skipped",
      genreCoverage: {
        withGenres: apps.filter((app) => app.genres.length > 0).length,
        total: apps.length,
      },
      apps,
    };
  });

  const successfulFeeds = settled.filter((feed) => feed.status === "ok").length;
  return NextResponse.json({
    product: "App Trend",
    dataMode: "live-public-chart",
    fetchedAt,
    refreshIntervalSeconds: 900,
    successfulFeeds,
    totalFeeds: SOURCES.length,
    feeds: feedsWithGenreCoverage,
    limitations: [
      "ランキングはApp Storeのチャートであり、ダウンロード数・売上額・利益を示すものではありません。",
      "無料・有料チャートの掲載順位は、将来の需要や事業成功を保証しません。",
      "一部の国・チャートが取得できない場合は、その状態を個別に表示します。",
    ],
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
    status: successfulFeeds === 0 ? 503 : 200,
  });
}
