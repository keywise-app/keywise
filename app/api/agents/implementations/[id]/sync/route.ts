// POST /api/agents/implementations/[id]/sync
// Forces a fresh GitHub poll for this implementation's PR status.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncImplementation } from "@/agents-framework/sync-pr";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const newStatus = await syncImplementation(supabase, id);
    return NextResponse.json({
      implementationId: id,
      changed: newStatus !== null,
      newStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
