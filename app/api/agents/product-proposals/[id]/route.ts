import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/admin-auth";

type Action = "approve" | "reject" | "start" | "ship" | "reopen";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  const { id } = await params;
  const { action, note } = (await req.json()) as {
    action: Action;
    note?: string;
  };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date().toISOString();
  let update: Record<string, any>;

  if (action === "approve") {
    update = {
      status: "approved",
      decided_at: now,
      decided_by: "chris",
      decision_note: note ?? null,
    };
  } else if (action === "reject") {
    update = {
      status: "rejected",
      decided_at: now,
      decided_by: "chris",
      decision_note: note ?? null,
    };
  } else if (action === "start") {
    update = { status: "in_progress" };
  } else if (action === "ship") {
    update = { status: "shipped" };
  } else if (action === "reopen") {
    update = {
      status: "proposed",
      decided_at: null,
      decided_by: null,
      decision_note: null,
    };
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("product_proposals")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
