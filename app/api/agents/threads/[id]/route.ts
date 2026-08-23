import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/admin-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  const { id } = await params;
  const { action } = (await req.json()) as { action: "dismiss" | "reopen" };

  let update: Record<string, any>;
  if (action === "dismiss") {
    update = { status: "dismissed" };
  } else if (action === "reopen") {
    update = { status: "new" };
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("forum_threads")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
