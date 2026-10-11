import type { Metadata, Viewport } from "next";
import GoogleLogin from "./components/google-login";
import "./globals.css";

const siteDescription = "アプリを企画・開発する人向け。米国と日本のApp Storeチャートを比較し、次に検証すべき仮説を分けて整理します。順位は売上や需要の証拠ではありません。";

export const metadata: Metadata = {
  metadataBase: new URL("https://app-trend-pi.vercel.app"),
  title: "App Trend — Find what to build next",
  description: siteDescription,
  applicationName: "App Trend",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "App Trend" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "App Trend — 次に作るアプリを、根拠から",
    description: siteDescription,
    locale: "ja_JP",
    type: "website",
    siteName: "App Trend",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "App Trend — 次に作るアプリを、根拠から",
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10131c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <a className="skip-link" href="#radar">チャートへ移動</a>
        {children}
        <GoogleLogin />
      </body>
    </html>
  );
}
