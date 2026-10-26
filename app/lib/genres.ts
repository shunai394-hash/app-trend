const LABELS: Array<{ label: string; aliases: string[] }> = [
  { label: "ブック", aliases: ["Books", "ブック"] },
  { label: "ビジネス", aliases: ["Business", "ビジネス"] },
  { label: "デベロッパツール", aliases: ["Developer Tools", "デベロッパツール"] },
  { label: "教育", aliases: ["Education", "教育"] },
  { label: "エンターテインメント", aliases: ["Entertainment", "エンターテインメント"] },
  { label: "ファイナンス", aliases: ["Finance", "ファイナンス"] },
  { label: "フード／ドリンク", aliases: ["Food & Drink", "Food and Drink", "フード／ドリンク", "フード/ドリンク"] },
  { label: "ゲーム", aliases: ["Games", "ゲーム"] },
  { label: "グラフィック／デザイン", aliases: ["Graphics & Design", "Graphics and Design", "グラフィック／デザイン", "グラフィック/デザイン"] },
  { label: "ヘルスケア／フィットネス", aliases: ["Health & Fitness", "Health and Fitness", "ヘルスケア／フィットネス", "ヘルスケア/フィットネス"] },
  { label: "ライフスタイル", aliases: ["Lifestyle", "ライフスタイル"] },
  { label: "雑誌／新聞", aliases: ["Magazines & Newspapers", "雑誌／新聞", "雑誌/新聞"] },
  { label: "メディカル", aliases: ["Medical", "メディカル"] },
  { label: "ミュージック", aliases: ["Music", "ミュージック"] },
  { label: "ナビゲーション", aliases: ["Navigation", "ナビゲーション"] },
  { label: "ニュース", aliases: ["News", "ニュース"] },
  { label: "写真／ビデオ", aliases: ["Photo & Video", "Photo and Video", "写真／ビデオ", "写真/ビデオ"] },
  { label: "仕事効率化", aliases: ["Productivity", "仕事効率化"] },
  { label: "辞書／辞典／その他", aliases: ["Reference", "辞書／辞典／その他", "辞書/辞典/その他"] },
  { label: "ショッピング", aliases: ["Shopping", "ショッピング"] },
  { label: "ソーシャルネットワーキング", aliases: ["Social Networking", "ソーシャルネットワーキング"] },
  { label: "スポーツ", aliases: ["Sports", "スポーツ"] },
  { label: "ステッカー", aliases: ["Stickers", "ステッカー"] },
  { label: "トラベル", aliases: ["Travel", "トラベル"] },
  { label: "ユーティリティ", aliases: ["Utilities", "ユーティリティ"] },
  { label: "天気", aliases: ["Weather", "天気"] },
];

function normalizeGenreName(value: string) {
  return value
    .normalize("NFKC")
    .replace(/&/g, " and ")
    .replace(/[／/]/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const GENRE_LABELS = new Map<string, string>();
for (const genre of LABELS) {
  for (const alias of genre.aliases) GENRE_LABELS.set(normalizeGenreName(alias), genre.label);
}

export function canonicalizeGenres(names: string[]) {
  const labels: string[] = [];
  const aliases: string[] = [];
  const seenLabels = new Set<string>();
  const seenAliases = new Set<string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const label = GENRE_LABELS.get(normalizeGenreName(trimmed)) ?? trimmed;
    if (!seenLabels.has(label)) {
      seenLabels.add(label);
      labels.push(label);
    }
    if (normalizeGenreName(trimmed) !== normalizeGenreName(label) && !seenAliases.has(trimmed)) {
      seenAliases.add(trimmed);
      aliases.push(trimmed);
    }
  }
  return { labels, aliases };
}
