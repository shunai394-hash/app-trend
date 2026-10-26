import assert from "node:assert/strict";
import test from "node:test";
import { buildAgentPlannerMessages, parseAgentPlan, validateGoal } from "./agent-runtime.ts";

const validPlan = {
  summary: "目標を小さな検証可能な作業に分けます。",
  successMetrics: ["全ステップの受け入れ条件を満たす"],
  steps: [
    { id: "step-1", agent: "Orchestrator", title: "要件を定義", objective: "目標を明確化", deliverable: "要件一覧", acceptanceCriteria: ["制約が明記されている"] },
    { id: "step-2", agent: "Builder", title: "成果物を作る", objective: "合意した要件を実装", deliverable: "初版成果物", acceptanceCriteria: ["要件に対応している"] },
    { id: "step-3", agent: "QA Reviewer", title: "独立検証", objective: "成果物を受け入れ条件と照合", deliverable: "検証レポート", acceptanceCriteria: ["不合格項目が記録されている"] },
  ],
  risks: ["入力不足"],
  guardrails: ["権限を最小化", "再試行に上限を設ける"],
  requiresHumanApproval: ["外部公開前"],
};

test("validates bounded user goals", () => {
  assert.equal(validateGoal("競合を調査して機会を整理する"), "競合を調査して機会を整理する");
  assert.equal(validateGoal("短い"), null);
  assert.equal(validateGoal("x".repeat(2001)), null);
  assert.equal(validateGoal({ goal: "not a string" }), null);
});

test("planner prompt clearly prohibits claiming execution", () => {
  const messages = buildAgentPlannerMessages("市場機会を調査する");
  assert.match(messages[0].content, /designs plans only/);
  assert.match(messages[0].content, /Return only valid JSON/);
});

test("accepts a valid plan and preserves the requested goal", () => {
  const result = parseAgentPlan("競合を調査して機会を整理する", validPlan);
  assert.equal(result?.goal, "競合を調査して機会を整理する");
  assert.equal(result?.steps.length, 3);
  assert.ok(result?.steps.some((step) => step.agent === "QA Reviewer"));
});

test("rejects plans without QA, approval requirements, or bounded guardrails", () => {
  assert.equal(parseAgentPlan("目標を十分に長くする", { ...validPlan, steps: validPlan.steps.slice(0, 2) }), null);
  assert.equal(parseAgentPlan("目標を十分に長くする", { ...validPlan, requiresHumanApproval: [] }), null);
  assert.equal(parseAgentPlan("目標を十分に長くする", { ...validPlan, guardrails: [] }), null);
});
