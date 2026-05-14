"use client";

// app/admin/agents/AdminLoginGate.tsx
//
// Client-side login UI that runs when the server layout couldn't find a valid
// admin cookie. Two paths:
//   1. The supabase-js client already has an admin session in localStorage —
//      we POST its access_token to /api/admin/agents/session to set the cookie,
//      then reload so the server layout sees the cookie and renders the real
//      dashboard.
//   2. No session — show an email/password form. After sign-in, repeat (1).

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

const ADMIN_EMAIL = "cccolwell@gmail.com";

export default function AdminLoginGate() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "checking" | "needs_login" | "submitting" | "denied"
  >("checking");
  const [error, setError] = useState<string | null>(null);

  async function bootstrap(accessToken: string): Promise<boolean> {
    const res = await fetch("/api/admin/agents/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    });
    return res.ok;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (cancelled) return;
        if (!session?.access_token) {
          setStatus("needs_login");
          return;
        }
        const userEmail = (session.user?.email || "").toLowerCase();
        if (userEmail !== ADMIN_EMAIL) {
          setStatus("denied");
          setError("This account is not authorized for the agents dashboard.");
          return;
        }
        const ok = await bootstrap(session.access_token);
        if (cancelled) return;
        if (ok) {
          window.location.reload();
        } else {
          setStatus("denied");
          setError("Authorization failed (profile.role must be 'admin').");
        }
      } catch {
        if (!cancelled) setStatus("needs_login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError || !data.session) {
      setError(authError?.message || "Sign-in failed");
      setStatus("needs_login");
      return;
    }
    if ((data.user?.email || "").toLowerCase() !== ADMIN_EMAIL) {
      setError("This account is not authorized.");
      setStatus("denied");
      return;
    }
    const ok = await bootstrap(data.session.access_token);
    if (!ok) {
      setError("Authorization failed (profile.role must be 'admin').");
      setStatus("denied");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white border rounded-xl p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Agents — sign in</h1>
        <p className="text-sm text-gray-600 mt-1">Restricted. Admin only.</p>

        {status === "checking" && (
          <p className="text-sm text-gray-500 mt-4">Checking session…</p>
        )}

        {status === "denied" && (
          <p className="text-sm text-red-700 mt-4">
            {error || "This account is not authorized."}
          </p>
        )}

        {(status === "needs_login" || status === "submitting") && (
          <form onSubmit={signIn} className="mt-4 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border rounded px-3 py-2 text-sm"
              autoComplete="email"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border rounded px-3 py-2 text-sm"
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full bg-gray-900 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
            >
              {status === "submitting" ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
