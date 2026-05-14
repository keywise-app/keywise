// POST /api/agents/implementations/[id]/retry
// Retries a failed implementation by firing the Dev agent again against the same proposal.
// Fire-and-forget: we kick the implement endpoint and return immediately so the
// browser doesn't sit waiting through Vercel's idle proxy timeout (~30s).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/admin-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: impl } = await supabase
    .from("proposal_implementations")
    .select("id, proposal_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!impl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!["agent_failed", "failed"].includes(impl.status)) {
    return NextResponse.json(
      { error: "Only failed implementations can be retried" },
      { status: 400 }
    );
  }

  // Fire-and-forget. The implement endpoint creates a new proposal_implementations
  // row immediately (status=agent_running) before doing the heavy lift, so the
  // dashboard reflects the retry instantly on next reload. We don't await the
  // full agent run because the browser would time out.
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  // Forward the caller's auth — they were already verified as admin above,
  // so the downstream call is authorized too.
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const res = await fetch(
    `${baseUrl}/api/agents/product-proposals/${impl.proposal_id}/implement`,
    {
      method: "POST",
      headers: authHeader ? { Authorization: authHeader } : undefined,
    }
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
