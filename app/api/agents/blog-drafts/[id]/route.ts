import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = (await req.json()) as {
    action: "publish" | "unpublish" | "archive";
  };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let update: Record<string, any>;
  if (action === "publish") {
    update = { status: "published", published_at: new Date().toISOString() };
  } else if (action === "unpublish") {
    update = { status: "draft", published_at: null };
  } else if (action === "archive") {
    update = { status: "archived" };
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("blog_drafts")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
