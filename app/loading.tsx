export default function Loading() {
  return (
    <main className="app-shell">
      <div className="loading-state" role="status" aria-live="polite">
        <span className="loading-orb" />
        <span>App Trendを準備しています…</span>
      </div>
    </main>
  );
}
