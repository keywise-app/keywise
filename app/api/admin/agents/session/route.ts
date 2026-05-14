// app/api/admin/agents/session/route.ts
//
// Bootstrap a server-side admin cookie from a Supabase access token that the
// client already has in localStorage. The cookie is httpOnly + Secure so the
// layout server component can verify the admin without trusting the browser.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  let token: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.access_token === "string") token = body.access_token;
  } catch {
    // ignore — fall back to header
  }
  if (!token) {
    const h = req.headers.get("authorization") || req.headers.get("Authorization");
    if (h) {
      const m = /^Bearer\s+(.+)$/i.exec(h.trim());
      if (m) token = m[1].trim();
    }
  }
  if (!token) {
    return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
  }

  const user = await verifyAdminToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Supabase access tokens are short-lived (default 1 hour). The cookie tracks
  // that — when it expires, the client gate re-bootstraps from a refreshed
  // session in localStorage.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
