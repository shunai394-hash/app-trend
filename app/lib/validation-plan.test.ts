import assert from "node:assert/strict";
import test from "node:test";
import { createValidationPlan } from "./validation-plan.ts";

test("creates a measurable short validation plan", () => {
  const plan = createValidationPlan({
    target: "個人開発者",
    problem: "競合調査に時間がかかる",
    priceModel: "月額サブスクリプション",
  });
  assert.equal(plan.steps.length, 4);
  assert.match(plan.steps[1].action, /個人開発者/);
  assert.match(plan.pricingExperiment, /価格を2案/);
  assert.match(plan.decisionRule, /有料の次アクション/);
});

test("B2B pricing plan requires a budget holder and paid pilot", () => {
  const plan = createValidationPlan({
    target: "小規模SaaS企業",
    problem: "市場調査に時間がかかる",
    priceModel: "法人向けライセンス",
  });
  assert.match(plan.pricingExperiment, /予算保有者/);
  assert.match(plan.pricingExperiment, /有料パイロット/);
});

test("undecided pricing investigates alternatives before choosing a price", () => {
  const plan = createValidationPlan({
    target: "利用者",
    problem: "困りごと",
    priceModel: "未定・顧客調査で確認",
  });
  assert.match(plan.pricingExperiment, /価格を決め打ちしない/);
});
