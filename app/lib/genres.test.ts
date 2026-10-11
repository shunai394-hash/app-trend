import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeGenres } from "./genres.ts";

test("Japanese and English names for the same genre count once", () => {
  const result = canonicalizeGenres(["ソーシャルネットワーキング", "写真／ビデオ", "Social Networking"]);
  assert.deepEqual(result.labels, ["ソーシャルネットワーキング", "写真／ビデオ"]);
  assert.ok(result.aliases.includes("Social Networking"));
});

test("US and Japan food genres share one label", () => {
  const us = canonicalizeGenres(["Food & Drink", "Shopping"]);
  const jp = canonicalizeGenres(["フード／ドリンク", "ショッピング"]);
  assert.deepEqual(us.labels, ["フード／ドリンク", "ショッピング"]);
  assert.deepEqual(jp.labels, ["フード／ドリンク", "ショッピング"]);
});

test("unknown genres are preserved", () => {
  const result = canonicalizeGenres(["Custom Workshop"]);
  assert.deepEqual(result.labels, ["Custom Workshop"]);
  assert.deepEqual(result.aliases, []);
});
