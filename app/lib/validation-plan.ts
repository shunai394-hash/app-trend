export type ValidationPlanInput = {
  target: string;
  problem: string;
  priceModel: string;
};

export type ValidationStep = {
  window: string;
  title: string;
  action: string;
  evidence: string;
};

export function createValidationPlan(input: ValidationPlanInput): {
  steps: ValidationStep[];
  pricingExperiment: string;
  decisionRule: string;
  caveat: string;
} {
  const isB2B = input.priceModel === "法人向けライセンス";
  const isUsageBased = input.priceModel === "従量課金";
  const isFreePlusPaid = input.priceModel === "無料 + 有料機能";
  const isUndecided = input.priceModel === "未定・顧客調査で確認";

  const pricingExperiment = isUndecided
    ? "最初に価格を決め打ちしない。顧客が現在使う代替手段、その費用、課題を放置するコストを聞き、支払い単位を特定する。"
    : isB2B
      ? "担当者だけでなく予算保有者も確認する。年間契約を先に売り込まず、導入範囲を絞った有料パイロットと承認プロセスを検証する。"
      : isUsageBased
        ? "従量の単位（処理件数・実行回数など）を顧客の成果と結びつけ、少量の有料利用で支払い上限と継続頻度を確認する。"
        : isFreePlusPaid
          ? "無料で解決できる範囲と、有料で時間・リスクを減らす機能を分ける。購入前に有料機能と価格を明示して反応を測る。"
          : "同じ価値提案で価格を2案ほど比較し、口頭の『払う』ではなく、有料パイロット・予約・決済などの行動を測る。";

  return {
    steps: [
      {
        window: "DAY 01–02",
        title: "レビューから課題を抽出",
        action: `「${input.problem}」に近い不満・代替手段・改善要望を、上位掲載アプリのレビューから最低20件記録する。`,
        evidence: "同じ課題が複数の利用者に繰り返し現れるか。レビュー件数だけで市場全体を推定しない。",
      },
      {
        window: "DAY 03–04",
        title: "対象ユーザーに聞く",
        action: `${input.target}に該当する5〜10人へ、直近に課題が起きた場面・頻度・現在の解決方法・実際に払った費用を聞く。最初からアイデアを売り込まない。`,
        evidence: "最近の具体例、現在の代替コスト、課題を解決するために既に取った行動。",
      },
      {
        window: "DAY 05",
        title: "価格付きの提案を出す",
        action: `課題を1つに絞った簡易ページか手動サービスを用意し、「${input.priceModel}」の支払い条件を明記する。`,
        evidence: pricingExperiment,
      },
      {
        window: "DAY 06–07",
        title: "行動を測り、次を決める",
        action: "対象ユーザーに近い人へ案内し、閲覧数だけでなく問い合わせ・予約・有料パイロット・実決済を分けて記録する。",
        evidence: "流入数、対象顧客率、登録/問い合わせ率、有料行動数、獲得にかかった時間と費用。",
      },
    ],
    pricingExperiment,
    decisionRule: "暫定ゲート：10人に聞いても直近の具体例がほぼ出ない場合は課題を再定義する。具体例が繰り返し出ても有料の次アクションがゼロなら、作り込む前に対象・価値提案・価格を変えて再テストする。少数サンプルで結論を確定しない。",
    caveat: "7日間・5〜10人は初回の低コスト実験用の目安で、統計的な需要証明ではありません。業界、単価、販売サイクルに合わせてサンプルと判定基準を調整してください。",
  };
}
