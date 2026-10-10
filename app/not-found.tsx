import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <span className="not-found-code">404 / NOT FOUND</span>
      <h1>このページは見つかりません。</h1>
      <p>URLを確認するか、App Trendのマーケットレーダーに戻ってください。</p>
      <Link href="/">マーケットレーダーへ戻る ↗</Link>
    </main>
  );
}
