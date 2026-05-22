// app/api/agents/pipeline/[id]/[action]/route.ts
//
// Server actions for the build_queue dashboard.
// - approve   → status='queued', approved_at=now, decided_by=email
// - reject    → status='rejected', decision_note=<reason>
// - ship      → status='shipped', shipped_at=now  (used after human merges PR
//                                                    or to confirm a marketing
//                                                    draft has gone out)
// - requeue   → status='queued', decision_note=null  (retry a failed item)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Action = "approve" | "reject" | "ship" | "requeue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (!["approve", "reject", "ship", "requeue"].includes(action)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  let body: { note?: string } = {};
  try {
    body = (await req.json()) as { note?: string };
  } catch {
    body = {};
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date().toISOString();
  const decidedBy = "cccolwell@gmail.com";
  let update: Record<string, unknown>;

  const a = action as Action;
  if (a === "approve") {
    update = {
      status: "queued",
      approved_at: now,
      decided_by: decidedBy,
      decision_note: body.note ?? null,
    };
  } else if (a === "reject") {
    update = {
      status: "rejected",
      decided_by: decidedBy,
      decision_note: body.note ?? "rejected",
    };
  } else if (a === "ship") {
    update = {
      status: "shipped",
      shipped_at: now,
      decided_by: decidedBy,
    };
  } else if (a === "requeue") {
    update = {
      status: "queued",
      decision_note: null,
    };
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("build_queue")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
