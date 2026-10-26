"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the message generic in the UI; production logs should be configured separately.
    console.error("App Trend route error", error.digest ?? error.name);
  }, [error]);

  return (
    <main className="not-found" role="alert">
      <span className="not-found-code">APP ERROR / RECOVERABLE</span>
      <h1>ページを正しく読み込めませんでした。</h1>
      <p>一時的なエラーの可能性があります。再読み込みしても解決しない場合は、少し時間をおいてお試しください。</p>
      <button className="refresh-button" onClick={() => reset()}>もう一度試す ↻</button>
      <Link href="/">トップへ戻る ↗</Link>
    </main>
  );
}
