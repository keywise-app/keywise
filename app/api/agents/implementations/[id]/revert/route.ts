// POST /api/agents/implementations/[id]/revert
//
// Opens a revert PR against the merge commit. GitHub doesn't expose a one-call
// revert API, so we use the standard "revert via UI" link: we open a PR using
// the `<merge_commit>^` parent as the head, with a clear title. The actual
// merge commit on main is preserved; we add a counter-commit on a new branch.
//
// Simpler v1: we point you at GitHub's UI Revert button on the original PR.
// The button is reliable; one click and the revert PR is auto-created by GitHub.
// This endpoint records that you chose to revert and updates the implementation
// status. You finalize the revert on GitHub.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { devConfig } from "@/agents/dev/config";

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
    .select("id, status, pr_number, proposal_id")
    .eq("id", id)
    .maybeSingle();
  if (!impl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (impl.status !== "shipped") {
    return NextResponse.json(
      { error: "Only shipped implementations can be reverted" },
      { status: 400 }
    );
  }

  await supabase
    .from("proposal_implementations")
    .update({
      status: "reverted",
      error:
        "Revert initiated by Chris. Open the PR on GitHub and click Revert there to finalize.",
    })
    .eq("id", id);
  await supabase
    .from("product_proposals")
    .update({ status: "rejected", decision_note: "Reverted after shipping" })
    .eq("id", impl.proposal_id);

  const revertUrl = `https://github.com/${devConfig.owner}/${devConfig.repo}/pull/${impl.pr_number}`;
  return NextResponse.json({
    reverted: true,
    revertUrl,
    note: "Click the Revert button on the original PR to create a revert PR. We've marked the implementation as reverted on the dashboard.",
  });
}
