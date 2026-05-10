// app/api/cron/agents/[role]/[task]/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getRole } from "@/agents-framework/registry";
import { runAgent } from "@/agents-framework/runner";

export const maxDuration = 300; // 5 minutes

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ role: string; task: string }> }
) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { role: roleId, task: taskId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const role = getRole(roleId);
  const result = await runAgent(role, taskId, supabase, anthropic, {
    trigger: "cron",
  });

  return NextResponse.json(result);
}
