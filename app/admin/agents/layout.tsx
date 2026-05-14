// app/admin/agents/layout.tsx
//
// Server-side gate for the entire /admin/agents subtree.
//
// If the admin cookie is missing or invalid, we render <AdminLoginGate /> here
// in the layout and DROP the children entirely. The page.tsx server components
// underneath never execute (their JSX is never instantiated), so no agent data
// is ever shipped to an unauthorized viewer.
//
// On successful sign-in the client gate POSTs to /api/admin/agents/session to
// set an httpOnly cookie, then reloads the page — at which point this layout
// finds a valid admin and renders the real children.

import { getAdminFromCookies } from "@/lib/admin-auth";
import AdminLoginGate from "./AdminLoginGate";

export const dynamic = "force-dynamic";

export default async function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return <AdminLoginGate />;
  }
  return <>{children}</>;
}
