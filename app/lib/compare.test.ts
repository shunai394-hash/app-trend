import assert from "node:assert/strict";
import test from "node:test";
import { genreSnapshot } from "./compare.ts";

const feeds = [
  {
    country: "us",
    chart: "top-free",
    status: "ok" as const,
    apps: [
      { name: "ChatGPT", rank: 3, genres: ["仕事効率化"] },
      { name: "Maps", rank: 18, genres: ["ナビゲーション"] },
    ],
  },
  {
    country: "jp",
    chart: "top-free",
    status: "ok" as const,
    apps: [
      { name: "ChatGPT", rank: 3, genres: ["仕事効率化"] },
      { name: "Starbucks", rank: 7, genres: ["フード／ドリンク"] },
    ],
  },
  { country: "jp", chart: "top-paid", status: "error" as const, apps: [] },
];

test("a genre outside the highlighted table still has a real comparison", () => {
  const signal = genreSnapshot(feeds, "top-free", "ナビゲーション");
  assert.equal(signal.us?.count, 1);
  assert.equal(signal.jp?.count, 0);
  assert.equal(signal.delta, 50);
  assert.deepEqual(signal.us?.examples, ["Maps（#18）"]);
});

test("a failed feed is not treated as a zero-app market", () => {
  const signal = genreSnapshot(feeds, "top-paid", "仕事効率化");
  assert.equal(signal.jp, null);
  assert.equal(signal.delta, null);
});
