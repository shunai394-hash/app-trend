"use client";

import Link from "next/link";
import { useState } from "react";

type Agent = { id: string; initial: string; name: string; role: string; detail: string; tint: string; status: string };
const AGENTS: Agent[] = [
  { id: "orchestrator", initial: "O", name: "Orchestrator", role: "統括・計画", detail: "目標を分解し、依存関係・担当・完了条件を設計", tint: "mint", status: "設計済み" },
  { id: "researcher", initial: "R", name: "Researcher", role: "調査・根拠", detail: "情報源、事実、推定、不確実性を整理", tint: "violet", status: "テンプレート" },
  { id: "builder", initial: "B", name: "Builder", role: "実装・成果物", detail: "承認された仕様から成果物を作成", tint: "amber", status: "テンプレート" },
  { id: "reviewer", initial: "Q", name: "QA Reviewer", role: "独立した品質監査", detail: "テスト・要件適合・安全性を検証し、不合格なら差し戻し", tint: "blue", status: "テンプレート" },
];
const SUGGESTIONS = [
  { label: "競合調査", value: "競合を調査し、出典・不確実性・比較軸を明記した意思決定レポートを作成する" },
  { label: "開発・QA", value: "仕様を整理してコードを実装し、自動テストと独立レビューに合格させる" },
  { label: "顧客分析", value: "顧客の声を分類し、優先課題と低コストな検証方法を提案する" },
];
const FLOW = [
  { number: "01", title: "目標を分解", agent: "Orchestrator", detail: "入力・制約・成功指標・完了条件を定義", icon: "◎", tint: "mint" },
  { number: "02", title: "専門タスクを実行", agent: "Researcher / Builder", detail: "依存関係を管理し、可能な作業を並列化", icon: "⌘", tint: "violet" },
  { number: "03", title: "独立した品質監査", agent: "QA Reviewer", detail: "根拠・テスト・安全性を基準に照合", icon: "◇", tint: "amber" },
  { number: "04", title: "承認して成果物を確定", agent: "Human approval", detail: "公開・削除・課金などの操作は人間が承認", icon: "✓", tint: "blue" },
];

export default function HomePage() {
  const [view, setView] = useState("overview");
  const [goal, setGoal] = useState("AIエージェントチームで市場調査から成果物作成、品質検証までを自動化する");
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  function createPlan() {
    if (!goal.trim()) { setNotice("達成したい目標を入力してください。"); return; }
    setCopied(false);
    setPlan({
      goal: goal.trim(),
      status: "draft_only_no_ai_execution",
      generatedAt: new Date().toISOString(),
      steps: [
        { agent: "Orchestrator", task: "目標を要件・制約・成功指標に分解する" },
        { agent: "Researcher", task: "必要な根拠と情報源を収集し、不確実性を記録する" },
        { agent: "Builder", task: "承認された仕様から成果物を作成する" },
        { agent: "QA Reviewer", task: "受け入れ基準に沿って独立検証し、不合格なら差し戻す" },
        { agent: "Human approval", task: "外部公開・削除・課金などの副作用を承認する" },
      ],
      guardrails: ["ツール権限は最小限に制限", "実行時間と再試行回数に上限を設定", "各工程の結果とエラーを記録", "完了条件未達の成果物を成功扱いしない"],
    });
    setNotice("計画の下書きを作成しました。実際のAI実行はまだ接続されていません。");
  }

  async function copyPlan() {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
      setCopied(true); setNotice("計画をクリップボードにコピーしました。");
    } catch { setNotice("コピーできませんでした。計画テキストを選択してコピーしてください。"); }
  }

  const pageTitles: Record<string, string> = { overview: "概要", agents: "エージェント", workflows: "ワークフロー", runs: "実行履歴", models: "モデル・ツール接続", quality: "品質ポリシー" };

  return (
    <main className="forge-shell">
      <aside className="forge-sidebar">
        <Link className="forge-brand" href="/" aria-label="Agent Forge ホーム"><span className="forge-mark">✳</span><span>AGENT<span className="forge-brand-muted">FORGE</span><small>AI WORKFLOW STUDIO</small></span></a>
        <div className="forge-workspace"><i /> App Trend workspace <span>⌄</span></div>
        <div className="forge-nav-label">WORKSPACE</div>
        {([["overview", "▦", "概要"], ["agents", "◈", "エージェント"], ["workflows", "⌘", "ワークフロー"], ["runs", "▷", "実行履歴"]] as const).map(([id, icon, label]) =>
          <button key={id} className={"forge-nav " + (view === id ? "active" : "")} onClick={() => { setView(id); setNotice(id === "runs" ? "実ジョブ実行は未接続のため、実行履歴はまだありません。" : ""); }}>{icon}<span>{label}</span></button>
        )}
        <div className="forge-nav-label forge-config-label">CONFIGURATION</div>
        <button className={"forge-nav " + (view === "models" ? "active" : "")} onClick={() => { setView("models"); setNotice("モデル接続は未設定です。APIキーをブラウザ側へ直接保存しない設計にします。"); }}>⚙<span>モデル・ツール接続</span></button>
        <button className={"forge-nav " + (view === "quality" ? "active" : "")} onClick={() => { setView("quality"); setNotice("品質ポリシーの管理画面は次の実装段階です。"); }}>⬡<span>品質ポリシー</span></button>
        <div className="forge-user"><span>AF</span><div>Workspace owner<small>App Trend · Preview</small></div></div>
      </aside>

      <section className="forge-main">
        <header className="forge-topbar"><div><span>App Trend / </span><b>{pageTitles[view] ?? "概要"}</b></div><div className="forge-top-actions"><span className="forge-status"><i /> プロトタイプ</span><button className="forge-help" aria-label="状態について" onClick={() => setNotice("画面は初期プロトタイプです。モデル、データベース、実タスク実行はまだ接続されていません。")}>?</button></div></header>
        <div className="forge-content">
          <div className="forge-eyebrow"><i /> AI AGENT ORCHESTRATION PLATFORM <span>PREVIEW · v0.2</span></div>
          <section className="forge-hero"><div><h1>アイデアを、<br /><em>動くワークフロー</em>へ。</h1><p>目的を伝えるだけで、役割・プロンプト・実行フロー・品質基準まで。<br className="forge-desktop-break" />設計から検証までを一つの場所で管理するAIエージェントスタジオ。</p></div><div className="forge-orbit" aria-hidden="true"><div className="forge-orbit-ring ring-one" /><div className="forge-orbit-ring ring-two" /><div className="forge-orbit-core">✳</div><span className="orbit-node node-one">◎</span><span className="orbit-node node-two">⌘</span><span className="orbit-node node-three">✓</span><span className="orbit-node node-four">✦</span></div></section>

          {notice && <div className="forge-notice" role="status"><span>ⓘ</span><div>{notice}</div><button onClick={() => setNotice("")} aria-label="通知を閉じる">×</button></div>}

          {view === "overview" && <>
            <section className="forge-stats">
              <article><span>エージェント設計テンプレート</span><strong>04</strong><small>役割分担の初期セット</small></article>
              <article><span>ワークフローパターン</span><strong>01</strong><small>承認ゲート付きサンプル</small></article>
              <article><span>実ジョブ実行</span><strong>—</strong><small>実行基盤は未接続</small></article>
              <article><span>品質ゲート</span><strong>設計中</strong><small>自動評価は次の段階</small></article>
            </section>
            <div className="forge-grid">
              <section className="forge-panel"><div className="forge-panel-head"><div><span className="forge-kicker">START WITH A GOAL</span><h2>何を達成しますか？</h2></div><span className="forge-spark">✳</span></div><p className="forge-sub">目標から必要な担当と実行順序を組み立て、計画の下書きを作成します。</p>
                <label htmlFor="forge-goal">達成したいこと</label><textarea id="forge-goal" className="forge-goal" maxLength={2000} value={goal} onChange={e => setGoal(e.target.value)} placeholder="達成したい目標を具体的に入力..." />
                <div className="forge-chips">{SUGGESTIONS.map(s => <button key={s.label} onClick={() => setGoal(s.value)}>{s.label}</button>)}</div>
                <button className="forge-primary" onClick={createPlan}>実行計画の下書きを作成 <span>↗</span></button>
                <p className="forge-hint">現時点では計画のプレビューです。モデル呼び出しや外部ツール実行は行いません。</p>
                {plan && <div className="forge-plan" aria-live="polite"><b>✓ 実行計画の下書き</b><pre>{JSON.stringify(plan, null, 2)}</pre><button onClick={copyPlan}>{copied ? "コピー済み ✓" : "計画をコピー"}</button></div>}
              </section>
              <section className="forge-panel"><div className="forge-panel-head"><div><span className="forge-kicker">WORKFLOW PREVIEW</span><h2>実行フロー</h2></div><span className="forge-tag">サンプル</span></div><p className="forge-sub">人間の承認と品質ゲートを含む標準パターン</p>
                <div className="forge-flow">{FLOW.map((s, i) => <div className="forge-flow-wrap" key={s.number}><div className="forge-step"><span className={"forge-step-icon " + s.tint}>{s.icon}</span><div><b>{s.number}　{s.title}</b><small>{s.agent} · {s.detail}</small></div><span className={"forge-step-check " + (i ? "pending" : "")}>{i ? "○" : "✓"}</span></div>{i < FLOW.length - 1 && <div className="forge-connector" />}</div>)}</div>
                <p className="forge-footnote">※ これは設計プレビューです。実際のタスクはまだ実行されません。</p>
              </section>
            </div>
            <section className="forge-panel forge-agents-panel"><div className="forge-panel-head"><div><span className="forge-kicker">AGENT REGISTRY</span><h2>専門エージェント</h2></div><button className="forge-text-btn" onClick={() => setView("agents")}>一覧を見る ↗</button></div><div className="forge-agent-list">{AGENTS.map(a => <AgentRow key={a.id} agent={a} onSelect={() => { setView("agents"); setNotice(a.name + "：役割テンプレートです。モデル接続とツール権限は未設定です。"); }} />)}</div></section>
          </>}

          {view === "agents" && <section className="forge-panel forge-subpage"><span className="forge-kicker">AGENT REGISTRY</span><h2>エージェント管理</h2><p className="forge-sub">各エージェントの責任範囲を明確にし、重複や権限の過剰付与を避けます。</p><div className="forge-agent-list">{AGENTS.map(a => <AgentRow key={a.id} agent={a} onSelect={() => setNotice(a.name + "：システムプロンプト、ツール権限、評価テストは次の実装段階です。")} />)}</div></section>}
          {view === "workflows" && <section className="forge-panel forge-subpage"><span className="forge-kicker">WORKFLOW DESIGN</span><h2>ワークフロー設計</h2><p className="forge-sub">開始条件から成果物まで、依存関係・失敗時の分岐・人間の承認を設計します。</p><div className="forge-flow">{FLOW.map((s,i)=><div className="forge-flow-wrap" key={s.number}><div className="forge-step"><span className={"forge-step-icon "+s.tint}>{s.icon}</span><div><b>{s.number}　{s.title}</b><small>{s.agent} · {s.detail}</small></div></div>{i<FLOW.length-1&&<div className="forge-connector"/>}</div>)}</div><div className="forge-notice"><span>ⓘ</span><div>現時点ではサンプル設計のみです。実行キュー、再試行、キャンセル、永続ログは未実装です。</div></div></section>}
          {view === "runs" && <section className="forge-panel forge-subpage"><span className="forge-kicker">EXECUTION HISTORY</span><h2>実行履歴</h2><div className="forge-empty"><span>▷</span><b>まだ実行ジョブはありません</b><p>モデルと実行基盤を接続すると、実行状態・所要時間・エラー・コスト・成果物を追跡できます。</p></div></section>}
          {view === "models" && <section className="forge-panel forge-subpage"><span className="forge-kicker">PROVIDER & TOOLS</span><h2>モデル・ツール接続</h2><p className="forge-sub">APIキーはサーバー側の暗号化された環境変数またはシークレット管理で保持し、ブラウザへ公開しません。</p><div className="forge-connection"><b>モデルプロバイダー</b><span>未接続</span><small>AI Gateway / プロバイダーアダプターを次に実装</small></div><div className="forge-connection"><b>ツールレジストリ</b><span>未接続</span><small>許可リスト、スキーマ検証、最小権限、タイムアウトを実装予定</small></div></section>}
          {view === "quality" && <section className="forge-panel forge-subpage"><span className="forge-kicker">QUALITY & SAFETY</span><h2>品質ポリシー</h2><p className="forge-sub">「完了した」と報告するだけでなく、合格条件を満たした証拠を確認します。</p>{["各タスクに明示的な完了条件を設定する","生成物を独立したレビュー担当が検証する","失敗時の再試行回数・時間・コストに上限を設ける","公開・削除・課金・外部送信は人間の承認を必須にする","実行ログ、モデル・プロンプトのバージョンを記録する"].map(item=><div className="forge-policy" key={item}><span>✓</span>{item}</div>)}</section>}
          <footer className="forge-footer"><span>AGENT FORGE © 2026</span><span>安全な自動化 · 人間の承認 · 監査可能性</span><span><i /> Prototype / v0.2</span></footer>
        </div>
      </section>
    </main>
  );
}

function AgentRow({ agent, onSelect }: { agent: Agent; onSelect: () => void }) {
  return <button className="forge-agent-row" onClick={onSelect}><span className={"forge-agent-icon " + agent.tint}>{agent.initial}</span><span className="forge-agent-info"><b>{agent.name} <small>· {agent.role}</small></b><em>{agent.detail}</em></span><span className={"forge-agent-state " + (agent.status === "設計済み" ? "ready" : "")}>{agent.status}</span><span className="forge-more">···</span></button>;
}
