export type AgentPlanStep = {
  id: string;
  agent: "Orchestrator" | "Researcher" | "Builder" | "QA Reviewer" | "Human approval";
  title: string;
  objective: string;
  deliverable: string;
  acceptanceCriteria: string[];
};

export type AgentPlan = {
  goal: string;
  summary: string;
  successMetrics: string[];
  steps: AgentPlanStep[];
  risks: string[];
  guardrails: string[];
  requiresHumanApproval: string[];
};

export function validateGoal(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const goal = value.trim();
  if (goal.length < 8 || goal.length > 2000) return null;
  return goal;
}

export function buildAgentPlannerMessages(goal: string) {
  return [
    {
      role: "system",
      content: [
        "You are the Orchestrator for a multi-agent workflow design platform.",
        "Design a practical, minimal, auditable agent team and execution plan for the user's goal.",
        "Return only valid JSON matching this schema:",
        '{"summary":"string","successMetrics":["string"],"steps":[{"id":"step-1","agent":"Orchestrator|Researcher|Builder|QA Reviewer|Human approval","title":"string","objective":"string","deliverable":"string","acceptanceCriteria":["string"]}],"risks":["string"],"guardrails":["string"],"requiresHumanApproval":["string"]}',
        "Use 3-7 steps. Include research only when evidence is needed, a builder only when creating an artifact is needed, and an independent QA Reviewer before completion.",
        "Do not claim that tools, external research, code execution, or deployment have occurred. This endpoint designs plans only.",
        "Include bounded retries, least-privilege tools, explicit acceptance criteria, and human approval for irreversible or external side effects.",
        "Be specific to the goal, avoid generic filler, and write all user-facing strings in Japanese.",
      ].join("\n"),
    },
    { role: "user", content: goal },
  ] as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown, min = 0, max = 12): string[] | null {
  if (!Array.isArray(value) || value.length < min || value.length > max) return null;
  if (!value.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= 500)) return null;
  return value.map((item) => (item as string).trim());
}

const ALLOWED_AGENTS = new Set(["Orchestrator", "Researcher", "Builder", "QA Reviewer", "Human approval"]);

export function parseAgentPlan(goal: string, value: unknown): AgentPlan | null {
  if (!isRecord(value) || typeof value.summary !== "string" || value.summary.trim().length < 5 || value.summary.length > 1500) return null;
  if (!Array.isArray(value.steps) || value.steps.length < 3 || value.steps.length > 7) return null;
  const steps: AgentPlanStep[] = [];
  for (const [index, item] of value.steps.entries()) {
    if (!isRecord(item)) return null;
    const id = typeof item.id === "string" && /^[a-z0-9-]{1,40}$/i.test(item.id) ? item.id : `step-${index + 1}`;
    if (typeof item.agent !== "string" || !ALLOWED_AGENTS.has(item.agent)) return null;
    if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 160) return null;
    if (typeof item.objective !== "string" || !item.objective.trim() || item.objective.length > 700) return null;
    if (typeof item.deliverable !== "string" || !item.deliverable.trim() || item.deliverable.length > 400) return null;
    const acceptanceCriteria = stringList(item.acceptanceCriteria, 1, 8);
    if (!acceptanceCriteria) return null;
    steps.push({
      id, agent: item.agent as AgentPlanStep["agent"], title: item.title.trim(),
      objective: item.objective.trim(), deliverable: item.deliverable.trim(), acceptanceCriteria,
    });
  }
  const successMetrics = stringList(value.successMetrics, 1, 8);
  const risks = stringList(value.risks, 0, 8);
  const guardrails = stringList(value.guardrails, 2, 10);
  const requiresHumanApproval = stringList(value.requiresHumanApproval, 1, 8);
  if (!successMetrics || !risks || !guardrails || !requiresHumanApproval) return null;
  if (!steps.some((step) => step.agent === "QA Reviewer")) return null;
  return {
    goal,
    summary: value.summary.trim(),
    successMetrics,
    steps,
    risks,
    guardrails,
    requiresHumanApproval,
  };
}
