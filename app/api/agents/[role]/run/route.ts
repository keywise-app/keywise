// app/api/agents/[role]/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getRole } from "@/agents-framework/registry";
import { runAgent } from "@/agents-framework/runner";
import { requireAdminApi } from "@/lib/admin-auth";

export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  const { role: roleId } = await params;
  const body = await req.json();
  const { task, promptOverride } = body as {
    task: string;
    promptOverride?: string;
  };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  try {
    const role = getRole(roleId);
    const result = await runAgent(role, task, supabase, anthropic, {
      trigger: "manual",
      promptOverride,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[agent-run] Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Agent run failed", status: "failed" },
      { status: 500 }
    );
  }
}
