// src/framework/execute-approval.ts
// Called from the admin UI when Chris taps "Approve" on a pending action.

import Anthropic from "@anthropic-ai/sdk";
import { getRole } from "./registry";
import { createMemoryStore } from "./memory";
import type { AgentContext } from "./types";

export async function executeApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  decisionNote: string | undefined,
  supabase: any,
  anthropic: Anthropic
) {
  const { data: approval, error } = await supabase
    .from("agent_approvals")
    .select("*")
    .eq("id", approvalId)
    .single();
  if (error || !approval) throw new Error("Approval not found");
  if (approval.status !== "pending") throw new Error("Already decided");

  const role = getRole(approval.role);
  const tool = role.tools.find((t) => t.name === approval.tool);
  if (!tool) throw new Error(`Tool ${approval.tool} no longer registered`);

  const now = new Date().toISOString();

  if (decision === "rejected") {
    await supabase
      .from("agent_approvals")
      .update({
        status: "rejected",
        decided_by: "chris",
        decided_at: now,
        decision_note: decisionNote,
      })
      .eq("id", approvalId);
    await supabase
      .from("agent_actions")
      .update({ status: "rejected" })
      .eq("approval_id", approvalId);
    return { status: "rejected" as const };
  }

  // Approved — execute
  const ctx: AgentContext = {
    runId: approval.run_id,
    role: approval.role,
    task: "approval",
    trigger: "manual",
    supabase,
    anthropic,
    memory: createMemoryStore(supabase, approval.role),
    note: async () => {},
  };

  try {
    const result = await tool.execute(approval.proposed_input, ctx);
    await supabase
      .from("agent_approvals")
      .update({
        status: "approved",
        decided_by: "chris",
        decided_at: now,
        decision_note: decisionNote,
      })
      .eq("id", approvalId);
    await supabase
      .from("agent_actions")
      .update({ status: "approved", result, executed_at: now })
      .eq("approval_id", approvalId);
    return { status: "approved" as const, result };
  } catch (err: any) {
    await supabase
      .from("agent_actions")
      .update({
        status: "failed",
        result: { error: String(err?.message ?? err) },
      })
      .eq("approval_id", approvalId);
    throw err;
  }
}
