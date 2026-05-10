// app/api/agents/[role]/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getRole } from "@/agents-framework/registry";
import { runAgent } from "@/agents-framework/runner";

export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  const { role: roleId } = await params;
  const body = await req.json();
  const { task, promptOverride } = body as {
    task: string;
    promptOverride?: string;
  };

  // TODO: gate on admin auth (check Supabase session, ensure email = chris@keywise.app)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const role = getRole(roleId);
  const result = await runAgent(role, task, supabase, anthropic, {
    trigger: "manual",
    promptOverride,
  });

  return NextResponse.json(result);
}
