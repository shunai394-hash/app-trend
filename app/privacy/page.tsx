export const metadata = {
  title: "プライバシー | App Trend",
  description: "App Trendのデータ取り扱いとプライバシーについて。",
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <a className="legal-back" href="/">← App Trendへ戻る</a>
      <p className="eyebrow">POLICY / PRIVACY</p>
      <h1>プライバシーについて</h1>
      <p className="legal-updated">最終更新日：2026年10月11日</p>
      <section>
        <h2>1. 現在のプレビューについて</h2>
        <p>App Trendの現在のプレビューでは、ユーザー登録、決済、プロフィール作成は提供していません。検索語はブラウザ上で表示中の公開チャートを絞り込むために使用し、アカウント情報として保存しません。</p>
      </section>
      <section>
        <h2>2. 取得する公開データ</h2>
        <p>米国・日本のApp Store公開チャートを参照し、アプリ名、開発元、公開リンク、順位、カテゴリ、アイコン画像などを表示します。これらは第三者の公開データソースから取得する情報です。</p>
      </section>
      <section>
        <h2>3. サーバー運用ログ</h2>
        <p>ホスティング事業者の通常の運用ログには、接続時刻、IPアドレス、ブラウザ情報、リクエスト先などが含まれる場合があります。ログの保存期間や取り扱いは、利用するホスティングサービスの設定・ポリシーに従います。</p>
      </section>
      <section>
        <h2>4. Cookie・分析ツール</h2>
        <p>現在のアプリコードでは、広告用Cookieやユーザー行動分析SDKを意図的に組み込んでいません。今後導入する場合は、用途とデータの取り扱いを本ページに追記します。</p>
      </section>
      <section>
        <h2>5. 今後の変更</h2>
        <p>アカウント、保存同期、課金、分析機能などを追加する場合は、実際のデータフローを確認し、このポリシーを更新してから公開します。</p>
      </section>
      <p className="legal-note">これは開発中プレビュー向けの説明です。正式公開前に、実際のホスティング設定・ログ保持期間・運営者連絡先を確認し、必要に応じて専門家のレビューを受けてください。</p>
    </main>
  );
}
