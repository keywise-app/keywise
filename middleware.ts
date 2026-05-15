// middleware.ts — gates /admin/agents/* and /api/agents/* behind the admin password.
//
// Auth model: matches the existing /admin/page.tsx pattern. The /admin login
// drops a `kw_admin` cookie equal to ADMIN_PASSWORD on successful login. Middleware
// checks that cookie value matches the env var. If it doesn't, browser navigations
// get redirected to /admin?next=<original>, and API calls get a JSON 401.
//
// What this gates:
//   /admin/agents/*       → human-facing dashboard, run buttons, approval cards
//   /api/agents/*         → run-an-agent, approve, implement, screenshot, merge, etc.
//
// What this does NOT gate (deliberately):
//   /api/cron/*           → Vercel cron, auth via CRON_SECRET in the route handlers
//   /api/webhooks/*       → Twilio, Stripe, Vercel webhooks auth via signatures
//   /api/stripe-*         → same
//   /api/admin            → has its own POST-body password check
//   /admin (the page itself) → that IS the login page

import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PAGE_PREFIXES = ["/admin/agents"];
const PROTECTED_API_PREFIXES = ["/api/agents/"];

function isProtectedPath(pathname: string): boolean {
  for (const p of PROTECTED_PAGE_PREFIXES) {
    if (pathname === p || pathname.startsWith(p + "/")) return true;
  }
  for (const p of PROTECTED_API_PREFIXES) {
    if (pathname.startsWith(p)) return true;
  }
  return false;
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // ADMIN_PASSWORD must be set in env. If it isn't, refuse — fail closed.
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    if (isApiPath(pathname)) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD env var not set on server — admin access disabled" },
        { status: 503 }
      );
    }
    return new NextResponse(
      "Admin access is disabled because ADMIN_PASSWORD is not configured on the server.",
      { status: 503, headers: { "content-type": "text/plain" } }
    );
  }

  const cookie = req.cookies.get("kw_admin")?.value;
  if (cookie === expected) {
    return NextResponse.next();
  }

  // Not authed.
  if (isApiPath(pathname)) {
    return NextResponse.json(
      { error: "Unauthorized — log in at /admin first" },
      { status: 401 }
    );
  }

  // Browser navigation: bounce to /admin with a return-to hint.
  const loginUrl = new URL("/admin", req.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/agents/:path*", "/api/agents/:path*"],
};
