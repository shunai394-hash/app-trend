"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

export default function GoogleLogin() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = useMemo<SupabaseClient | null>(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      setMessage("ログイン設定が未完了です。管理者は Supabase の公開 URL と publishable/anon key を Vercel に設定してください。");
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage("ログイン状態を確認できませんでした。再読み込みしてください。");
      setUser(data.session?.user ?? null);
      setReady(true);
    }).catch(() => {
      if (!active) return;
      setMessage("ログイン状態を確認できませんでした。ネットワークを確認して再読み込みしてください。");
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setMessage("");
      setReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signIn() {
    if (!supabase) {
      setMessage("Supabase の公開 URL と publishable/anon key が必要です。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        setMessage("Google ログインを開始できませんでした。Supabase の Google 設定と Google Cloud の OAuth 設定を確認してください。");
        setBusy(false);
      }
    } catch {
      setMessage("Google に接続できませんでした。通信状態を確認して、もう一度お試しください。");
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setMessage("ログアウトできませんでした。もう一度お試しください。");
    } catch {
      setMessage("ログアウト時に通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      aria-label="Google ログイン"
      style={{
        position: "fixed",
        zIndex: 100,
        right: "max(18px, env(safe-area-inset-right))",
        bottom: "max(18px, env(safe-area-inset-bottom))",
        width: "min(340px, calc(100vw - 28px))",
        padding: 12,
        border: "1px solid #394557",
        borderRadius: 16,
        background: "rgba(17, 23, 32, 0.96)",
        boxShadow: "0 16px 50px rgba(0,0,0,.35)",
        backdropFilter: "blur(14px)",
        color: "#f2f5fb",
      }}
    >
      {!ready ? (
        <p style={{ margin: 0, fontSize: 12, color: "#a0adbf" }}>ログイン状態を確認中…</p>
      ) : user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, color: "#c7fa83", fontSize: 10, letterSpacing: ".08em" }}>SIGNED IN</p>
            <p title={user.email ?? ""} style={{ margin: "3px 0 0", fontSize: 12, overflowWrap: "anywhere" }}>
              {user.email ?? "Google アカウントでログイン中"}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            style={secondaryButton}
          >
            {busy ? "処理中…" : "ログアウト"}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ margin: "0 0 9px", fontSize: 12, fontWeight: 700 }}>App Trend にログイン</p>
          <button
            type="button"
            onClick={signIn}
            disabled={busy || !ready}
            style={primaryButton}
          >
            <GoogleMark />
            {busy ? "Google に接続中…" : "Google でログイン"}
          </button>
        </div>
      )}
      {message && (
        <p role="status" style={{ margin: "9px 0 0", color: "#ffbe7a", fontSize: 10, lineHeight: 1.6 }}>
          {message}
        </p>
      )}
    </aside>
  );
}

const primaryButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  width: "100%",
  minHeight: 44,
  border: "1px solid #c7fa83",
  borderRadius: 10,
  background: "#c7fa83",
  color: "#15200d",
  fontSize: 12,
  fontWeight: 750,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  flexShrink: 0,
  minHeight: 38,
  padding: "0 11px",
  border: "1px solid #394557",
  borderRadius: 9,
  background: "#1b2431",
  color: "#f2f5fb",
  fontSize: 11,
  cursor: "pointer",
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.95 46.98 31.85 46.98 24.55Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}
