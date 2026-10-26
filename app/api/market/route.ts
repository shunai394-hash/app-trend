import { NextResponse } from "next/server";
import { canonicalizeGenres } from "../../lib/genres";

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

function sourceErrorMessage(error: unknown) {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return "ソースの応答が時間内に返りませんでした。";
  }
  if (error instanceof Error && error.message.startsWith("Apple feed returned HTTP")) {
    return `Appleのチャートが${error.message.replace("Apple feed returned HTTP", " HTTP")}を返しました。`;
  }
  if (error instanceof Error && error.message === "Feed format was empty or not recognized") {
    return "チャートの形式を読み取れませんでした。空の市場としては扱いません。";
  }
  return "このチャートを取得できませんでした。";
}

async function fetchAppleFeed(url: string) {
  const attempt = (timeoutMs: number, revalidate: boolean) => fetch(url, {
    headers: { accept: "application/json" },
    cache: revalidate ? undefined : "no-store",
    next: revalidate ? { revalidate: 900 } : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  try {
    const response = await attempt(12000, true);
    if (response.status < 500) return response;
  } catch {
    // Retry timeouts and network failures once. A short retry hides transient Apple slowness.
  }
  return attempt(12000, false);
}

export async function GET() {
  const fetchedAt = new Date().toISOString();
  const settled = await Promise.all(SOURCES.map(async (source) => {
    try {
      const response = await fetchAppleFeed(source.url);
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
        error: sourceErrorMessage(error),
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
    const failed = feed.status !== "ok";
    const apps = feed.apps.map((app) => {
      const canonical = canonicalizeGenres([...app.genres, ...(lookup?.genresById.get(app.id) ?? [])]);
      return {
        ...app,
        genres: canonical.labels,
        genreAliases: canonical.aliases,
      };
    });
    return {
      ...feed,
      genreLookupUrl: failed ? null : lookup?.url ?? null,
      genreLookupStatus: failed ? "skipped" as const : lookup?.status ?? "skipped",
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
