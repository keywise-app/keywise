// POST /api/agents/product-proposals/[id]/implement
//
// Marks the proposal as 'approved' and inserts a queued proposal_implementations row.
// In commit 1 this only creates the row — the Dev agent isn't wired yet, so the row
// stays in 'queued' status until commit 2 ships. That's intentional and visible in the UI.

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

  // 1. Verify the proposal exists and is in a state where implementing makes sense.
  const { data: proposal, error: pErr } = await supabase
    .from("product_proposals")
    .select("id, status, title, severity, affected_route")
    .eq("id", id)
    .maybeSingle();
  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (["shipped"].includes(proposal.status)) {
    return NextResponse.json(
      { error: "Already shipped" },
      { status: 400 }
    );
  }

  // 2. Bump proposal to 'approved' with audit fields.
  const now = new Date().toISOString();
  await supabase
    .from("product_proposals")
    .update({
      status: "approved",
      decided_at: now,
      decided_by: "chris",
      decision_note: "Approved & implement clicked — Dev agent will draft a PR.",
    })
    .eq("id", id);

  // 3. Create the implementation row.
  const { data: impl, error: iErr } = await supabase
    .from("proposal_implementations")
    .insert({
      proposal_id: id,
      status: "queued",
    })
    .select("id")
    .single();
  if (iErr) {
    return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  // 4. (Commit 2 will add: fire the Dev agent here.)
  // For now the row stays in 'queued'. The UI shows it that way so you can see
  // the plumbing works before the agent does anything risky.

  return NextResponse.json({
    implementationId: impl.id,
    status: "queued",
    note:
      "Implementation row created. Dev agent wiring ships in commit 2 — refresh to see status updates once it's live.",
  });
}
