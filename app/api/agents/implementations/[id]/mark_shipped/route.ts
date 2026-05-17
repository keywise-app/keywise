// POST /api/agents/implementations/[id]/mark_shipped
// Manual override for when the pipeline is stuck but the change is actually live.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  if (impl.status === "shipped") {
    return NextResponse.json({ error: "Already shipped" }, { status: 400 });
  }

  const now = new Date().toISOString();
  await supabase
    .from("proposal_implementations")
    .update({
      status: "shipped",
      shipped_at: now,
      merged_at: now, // best-guess if we don't have it
    })
    .eq("id", id);
  if (impl.proposal_id) {
    await supabase
      .from("product_proposals")
      .update({ status: "shipped" })
      .eq("id", impl.proposal_id);
  }
  return NextResponse.json({ implementationId: id, shipped: true });
}
