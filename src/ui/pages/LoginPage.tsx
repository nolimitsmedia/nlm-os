// apps/web/src/ui/pages/LoginPage.tsx
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../../api";

export default function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const nextParam = params.get("next") || "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      await login(email, password);
      nav(next, { replace: true });
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Login failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#fff",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 420,
          padding: 22,
          borderRadius: 16,
          background: "#022855",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 12 }}>NLM OS Login</h2>

        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="websupport@nolimitsmedia.com"
          autoComplete="username"
          style={{ width: "100%", padding: 10, borderRadius: 10 }}
        />

        <div style={{ height: 12 }} />

        <label style={{ display: "block", marginBottom: 6 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{ width: "100%", padding: 10, borderRadius: 10 }}
        />

        {err ? (
          <div style={{ marginTop: 12, color: "#ff6b6b" }}>{err}</div>
        ) : null}

        <button
          disabled={busy}
          style={{
            marginTop: 14,
            width: "100%",
            padding: 12,
            borderRadius: 12,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
