import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "App Trend — Find what to build next",
    short_name: "App Trend",
    description: "米国・日本のApp Storeチャートから、次に検証するアプリの機会を探す。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d1017",
    theme_color: "#10131c",
    lang: "ja",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ],
  };
}
