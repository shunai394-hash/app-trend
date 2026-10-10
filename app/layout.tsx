import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Trend — Find what to build next",
  description: "米国・日本のApp Storeチャートを根拠に、次に検証すべきアプリの機会を探す。",
  applicationName: "App Trend",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "App Trend" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10131c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
