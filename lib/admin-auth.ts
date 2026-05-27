// lib/admin-auth.ts
//
// Server-side auth helpers for admin/agents routes and APIs.
//
// Two trusted callers:
//   1. Cron jobs       — Authorization: Bearer <CRON_SECRET>
//   2. The admin user  — a JWT whose email = ADMIN_EMAIL and whose profile.role = 'admin'
//
// Anything else is unauthorized.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "cccolwell@gmail.com";
export const ADMIN_COOKIE = "kw-admin-token";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

type AdminUser = { id: string; email: string };

export async function verifyAdminToken(token: string): Promise<AdminUser | null> {
  if (!token) return null;
  const supabase = adminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  const user = data.user;
  if ((user.email || "").toLowerCase() !== ADMIN_EMAIL) return null;

  return { id: user.id, email: user.email! };
}

function extractBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/**
 * Gate for `/api/agents/*` routes. Accepts the admin user's JWT, or CRON_SECRET
 * for system callers that need to hit these endpoints (rare — most cron is on
 * `/api/cron/agents/*`).
 *
 * Returns a 401 NextResponse on failure, or `null` if authorized.
 */
export async function requireAdminApi(req: Request): Promise<NextResponse | null> {
  const token = extractBearer(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
    return null;
  }

  const user = await verifyAdminToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Gate for `/api/cron/agents/*` — only CRON_SECRET. (Admin JWT is also accepted
 * so you can manually fire a cron from a logged-in browser session if needed.)
 */
export async function requireCronOrAdmin(req: Request): Promise<NextResponse | null> {
  const token = extractBearer(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
    return null;
  }
  const user = await verifyAdminToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Reads the admin cookie set by `/api/admin/agents/session` and verifies it.
 * Used by `app/admin/agents/layout.tsx` to gate the dashboard server-side.
 */
export async function getAdminFromCookies(): Promise<AdminUser | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
