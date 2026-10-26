import Link from "next/link";

export const metadata = {
  title: "プライバシー | App Trend",
  description: "App Trendのデータ取り扱いとプライバシーについて。",
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <Link className="legal-back" href="/">← App Trendへ戻る</Link>
      <p className="eyebrow">POLICY / PRIVACY</p>
      <h1>プライバシーについて</h1>
      <p className="legal-updated">最終更新日：2026年10月11日</p>
      <section>
        <h2>1. 現在のプレビューについて</h2>
        <p>App Trendは、任意のGoogleログインを表示しています。ログインしても、調査ブリーフ、検索条件、ウォッチリストはアカウントへ保存されません。決済とプロフィール作成はありません。検索語はブラウザ上で表示中の公開チャートを絞り込むために使い、サーバーへ調査内容として保存しません。</p>
      </section>
      <section>
        <h2>2. 取得する公開データ</h2>
        <p>米国・日本のApp Store公開チャートを参照し、アプリ名、開発元、公開リンク、順位、カテゴリ、アイコン画像などを表示します。これらは第三者の公開データソースから取得する情報です。</p>
      </section>
      <section>
        <h2>3. 外部フォント</h2>
        <p>現在の画面ではGoogle Fontsからフォントを読み込んでいます。ブラウザがfonts.googleapis.comおよびfonts.gstatic.comへ接続する際、IPアドレスやブラウザ情報などがGoogle側に送信される場合があります。外部リソースを使わない運用に切り替える場合は、フォントをセルフホストするか、外部フォント読み込みを削除します。</p>
      </section>
      <section>
        <h2>4. サーバー運用ログ</h2>
        <p>ホスティング事業者の通常の運用ログには、接続時刻、IPアドレス、ブラウザ情報、リクエスト先などが含まれる場合があります。ログの保存期間や取り扱いは、利用するホスティングサービスの設定・ポリシーに従います。</p>
      </section>
      <section>
        <h2>5. ログインとブラウザへの保存</h2>
        <p>Googleログインを選ぶと、認証はSupabase Authを通じて行われます。メールアドレスなどのアカウント識別子とセッションが扱われ、ブラウザにセッションが残ります。他の利用者の調査データを保存するテーブルは現在ありません。広告用Cookieやユーザー行動分析SDKは組み込んでいません。今後、調査の保存や分析を追加する場合は、用途を本ページに追記してから公開します。</p>
      </section>
      <section>
        <h2>6. 今後の変更</h2>
        <p>アカウント、保存同期、課金、分析機能などを追加する場合は、実際のデータフローを確認し、このポリシーを更新してから公開します。</p>
      </section>
      <p className="legal-note">これは開発中プレビュー向けの説明です。正式公開前に、実際のホスティング設定・ログ保持期間・運営者連絡先を確認し、必要に応じて専門家のレビューを受けてください。</p>
    </main>
  );
}
