type ComparableApp = { name: string; rank: number; genres: string[] };
type ComparableFeed = { country: string; chart: string; status: "ok" | "error"; apps: ComparableApp[] };

export function genreSnapshot(feeds: ComparableFeed[], chart: string, genre: string) {
  const read = (country: string) => {
    const feed = feeds.find((item) => item.country === country && item.chart === chart && item.status === "ok");
    if (!feed) return null;
    const matches = feed.apps.filter((app) => app.genres.includes(genre));
    return {
      count: matches.length,
      total: feed.apps.length,
      examples: matches.slice(0, 3).map((app) => `${app.name}（#${app.rank}）`),
    };
  };
  const us = read("us");
  const jp = read("jp");
  const share = (item: { count: number; total: number } | null) => item && item.total ? item.count / item.total * 100 : null;
  const usShare = share(us);
  const jpShare = share(jp);
  return { us, jp, delta: usShare !== null && jpShare !== null ? usShare - jpShare : null };
}
