// src/framework/approvals.ts
import type { AgentContext, AgentTool } from "./types";

export interface QueuedApproval {
  id: string;
  estimatedImpact?: string;
}

export async function queueApproval<TInput>(
  ctx: AgentContext,
  tool: AgentTool<TInput>,
  input: TInput,
  reasoning: string
): Promise<QueuedApproval> {
  const estimatedImpact = tool.estimateImpact
    ? await tool.estimateImpact(input, ctx)
    : undefined;

  const { data, error } = await ctx.supabase
    .from("agent_approvals")
    .insert({
      run_id: ctx.runId,
      role: ctx.role,
      tool: tool.name,
      reasoning,
      proposed_input: input,
      estimated_impact: estimatedImpact,
    })
    .select("id")
    .single();
  if (error) throw error;

  await ctx.supabase.from("agent_actions").insert({
    run_id: ctx.runId,
    role: ctx.role,
    tool: tool.name,
    authority: "approve",
    status: "pending_approval",
    reasoning,
    input,
    estimated_impact: estimatedImpact,
    approval_id: data.id,
  });

  // Optional: send a notification email/Slack here. Stub for now.
  await notifyPendingApproval(ctx, tool, input, estimatedImpact);

  return { id: data.id, estimatedImpact };
}

export async function escalate<TInput>(
  ctx: AgentContext,
  tool: AgentTool<TInput>,
  input: TInput,
  reasoning: string
) {
  const estimatedImpact = tool.estimateImpact
    ? await tool.estimateImpact(input, ctx)
    : undefined;

  await ctx.supabase.from("agent_actions").insert({
    run_id: ctx.runId,
    role: ctx.role,
    tool: tool.name,
    authority: "escalate",
    status: "escalated",
    reasoning,
    input,
    estimated_impact: estimatedImpact,
  });

  await notifyEscalation(ctx, tool, input, reasoning);
}

async function notifyPendingApproval(
  _ctx: AgentContext,
  _tool: AgentTool,
  _input: any,
  _impact?: string
) {
  // TODO: wire to Resend. Quick win: daily digest of pending approvals.
}

async function notifyEscalation(
  _ctx: AgentContext,
  _tool: AgentTool,
  _input: any,
  _reasoning: string
) {
  // TODO: wire to Resend immediately for escalations.
}
