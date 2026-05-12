// lib/agents-framework/approvals.ts
import type { AgentContext, AgentTool } from "./types";
import { Resend } from "resend";

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

// ─────────────────────────────────────────────────────────────────
// Notification helpers
// ─────────────────────────────────────────────────────────────────

const THROTTLE_KEY = "notifications:last_hour";
const MAX_PER_HOUR = 5;

async function isThrottled(supabase: any): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("agent_memory")
      .select("value")
      .eq("role", "_system")
      .eq("key", THROTTLE_KEY)
      .maybeSingle();
    if (!data?.value) return false;
    const { count, hour } = data.value as { count: number; hour: string };
    const currentHour = new Date().toISOString().slice(0, 13);
    if (hour !== currentHour) return false; // different hour, reset
    return count >= MAX_PER_HOUR;
  } catch {
    return false;
  }
}

async function incrementThrottle(supabase: any): Promise<void> {
  try {
    const currentHour = new Date().toISOString().slice(0, 13);
    const { data } = await supabase
      .from("agent_memory")
      .select("value")
      .eq("role", "_system")
      .eq("key", THROTTLE_KEY)
      .maybeSingle();

    const existing = data?.value as { count: number; hour: string } | null;
    const newCount = existing?.hour === currentHour ? (existing.count || 0) + 1 : 1;

    await supabase
      .from("agent_memory")
      .upsert(
        {
          role: "_system",
          key: THROTTLE_KEY,
          value: { count: newCount, hour: currentHour },
          importance: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "role,key" }
      );
  } catch {
    // non-fatal
  }
}

function emailHtml({
  type,
  role,
  tool,
  reasoning,
  impact,
  input,
}: {
  type: "approval" | "escalation";
  role: string;
  tool: string;
  reasoning: string;
  impact?: string;
  input: any;
}): string {
  const color = type === "escalation" ? "#DC2626" : "#F59E0B";
  const label = type === "escalation" ? "ESCALATION" : "APPROVAL NEEDED";
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
  <div style="background:#0F3460;padding:20px 28px;border-radius:12px 12px 0 0">
    <div style="color:#00D4AA;font-size:18px;font-weight:700">keywise</div>
  </div>
  <div style="background:white;padding:28px;border:1px solid #E0E6F0;border-radius:0 0 12px 12px">
    <div style="display:inline-block;background:${color}18;color:${color};font-size:11px;font-weight:700;padding:3px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">${label}</div>
    <h2 style="color:#0F3460;font-size:18px;margin:0 0 8px;font-weight:700">${tool}</h2>
    <p style="color:#4A5068;font-size:14px;line-height:1.6;margin:0 0 16px">${reasoning}</p>
    ${impact ? `<div style="background:#F0F4FF;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#0F3460;font-weight:600">Estimated impact: ${impact}</div>` : ""}
    <details style="margin-bottom:20px">
      <summary style="font-size:12px;color:#8892A4;cursor:pointer">View proposed action</summary>
      <pre style="margin-top:8px;background:#F0F4FF;border:1px solid #E0E6F0;border-radius:8px;padding:12px;font-size:12px;overflow:auto;max-height:200px">${JSON.stringify(input, null, 2)}</pre>
    </details>
    <a href="https://keywise.app/admin/agents" style="display:inline-block;background:#0F3460;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Open Dashboard →</a>
    <p style="color:#8892A4;font-size:11px;margin-top:20px">Agent: ${role} · Run: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC</p>
  </div>
</div>`;
}

async function notifyPendingApproval(
  ctx: AgentContext,
  tool: AgentTool,
  input: any,
  impact?: string
) {
  try {
    if (await isThrottled(ctx.supabase)) {
      console.error("[notify] Throttled — skipping approval email for", tool.name);
      return;
    }
    const to = process.env.ADMIN_EMAIL;
    if (!to || !process.env.RESEND_API_KEY) return;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Keywise CMO <noreply@keywise.app>",
      to,
      subject: `[Keywise CMO] Approval needed: ${tool.name}`,
      html: emailHtml({
        type: "approval",
        role: ctx.role,
        tool: tool.name,
        reasoning: tool.describeAction?.(input) || "Action requires your approval",
        impact,
        input,
      }),
    });
    await incrementThrottle(ctx.supabase);
  } catch (err) {
    console.error("[notify] Failed to send approval email:", err);
  }
}

async function notifyEscalation(
  ctx: AgentContext,
  tool: AgentTool,
  input: any,
  reasoning: string
) {
  try {
    if (await isThrottled(ctx.supabase)) {
      console.error("[notify] Throttled — skipping escalation email for", tool.name);
      return;
    }
    const to = process.env.ADMIN_EMAIL;
    if (!to || !process.env.RESEND_API_KEY) return;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Keywise CMO <noreply@keywise.app>",
      to,
      subject: `[Keywise CMO] ⚠️ Escalation: ${tool.name}`,
      html: emailHtml({
        type: "escalation",
        role: ctx.role,
        tool: tool.name,
        reasoning,
        input,
      }),
    });
    await incrementThrottle(ctx.supabase);
  } catch (err) {
    console.error("[notify] Failed to send escalation email:", err);
  }
}

// ─────────────────────────────────────────────────────────────────
// Daily digest (called from cron)
// ─────────────────────────────────────────────────────────────────

export async function notifyDailyDigest(supabase: any): Promise<{ sent: boolean; error?: string }> {
  try {
    const to = process.env.ADMIN_EMAIL;
    if (!to || !process.env.RESEND_API_KEY) return { sent: false, error: "Missing ADMIN_EMAIL or RESEND_API_KEY" };

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: runs }, { data: approvals }, { data: actions }] = await Promise.all([
      supabase.from("agent_runs").select("id, role, task, status, cost_usd, summary").gte("started_at", since).order("started_at", { ascending: false }),
      supabase.from("agent_approvals").select("id, role, tool, reasoning, estimated_impact").eq("status", "pending"),
      supabase.from("agent_actions").select("id").eq("status", "executed").gte("created_at", since),
    ]);

    const totalRuns = (runs || []).length;
    const pendingApprovals = (approvals || []).length;
    const autoActions = (actions || []).length;
    const totalCost = (runs || []).reduce((s: number, r: any) => s + (Number(r.cost_usd) || 0), 0);

    if (totalRuns === 0 && pendingApprovals === 0) {
      return { sent: false, error: "Nothing to report" };
    }

    const runSummaries = (runs || []).slice(0, 8).map((r: any) =>
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #E0E6F0;font-size:13px">${r.role}/${r.task}</td><td style="padding:6px 8px;border-bottom:1px solid #E0E6F0;font-size:13px;text-align:center"><span style="background:${r.status === 'success' ? '#E8F8F0' : r.status === 'failed' ? '#FFF0F0' : '#FFF8E0'};color:${r.status === 'success' ? '#0F7040' : r.status === 'failed' ? '#DC2626' : '#9A6500'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${r.status}</span></td><td style="padding:6px 8px;border-bottom:1px solid #E0E6F0;font-size:13px;text-align:right">$${(Number(r.cost_usd) || 0).toFixed(3)}</td></tr>`
    ).join("");

    const approvalList = (approvals || []).slice(0, 5).map((a: any) =>
      `<li style="margin-bottom:6px;font-size:13px;color:#4A5068"><strong>${a.tool}</strong> — ${a.reasoning?.slice(0, 80) || "Needs review"}${a.estimated_impact ? ` (${a.estimated_impact})` : ""}</li>`
    ).join("");

    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
  <div style="background:#0F3460;padding:20px 28px;border-radius:12px 12px 0 0">
    <div style="color:#00D4AA;font-size:18px;font-weight:700">keywise — daily agent digest</div>
  </div>
  <div style="background:white;padding:28px;border:1px solid #E0E6F0;border-radius:0 0 12px 12px">
    <p style="color:#4A5068;font-size:14px;margin:0 0 16px">Here's what your agents did in the last 24 hours.</p>

    <div style="display:flex;gap:16px;margin-bottom:20px">
      <div style="flex:1;background:#F0F4FF;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:#0F3460">${totalRuns}</div>
        <div style="font-size:11px;color:#8892A4;text-transform:uppercase">Runs</div>
      </div>
      <div style="flex:1;background:${pendingApprovals > 0 ? '#FFF8E0' : '#E8F8F0'};border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${pendingApprovals > 0 ? '#9A6500' : '#0F7040'}">${pendingApprovals}</div>
        <div style="font-size:11px;color:#8892A4;text-transform:uppercase">Pending</div>
      </div>
      <div style="flex:1;background:#F0F4FF;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:#0F3460">${autoActions}</div>
        <div style="font-size:11px;color:#8892A4;text-transform:uppercase">Auto-actions</div>
      </div>
      <div style="flex:1;background:#F0F4FF;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:#0F3460">$${totalCost.toFixed(2)}</div>
        <div style="font-size:11px;color:#8892A4;text-transform:uppercase">Cost</div>
      </div>
    </div>

    ${totalRuns > 0 ? `<h3 style="color:#0F3460;font-size:14px;margin:0 0 8px">Recent runs</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><th style="text-align:left;padding:6px 8px;font-size:11px;color:#8892A4;border-bottom:2px solid #E0E6F0">Task</th><th style="text-align:center;padding:6px 8px;font-size:11px;color:#8892A4;border-bottom:2px solid #E0E6F0">Status</th><th style="text-align:right;padding:6px 8px;font-size:11px;color:#8892A4;border-bottom:2px solid #E0E6F0">Cost</th></tr>
      ${runSummaries}
    </table>` : ""}

    ${pendingApprovals > 0 ? `<h3 style="color:#9A6500;font-size:14px;margin:0 0 8px">⚠️ Awaiting your approval</h3>
    <ul style="padding-left:20px;margin:0 0 20px">${approvalList}</ul>` : ""}

    <a href="https://keywise.app/admin/agents" style="display:inline-block;background:#0F3460;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Open Agent Dashboard →</a>
    <p style="color:#8892A4;font-size:11px;margin-top:20px">Digest for ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })} · Keywise Agents</p>
  </div>
</div>`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Keywise Agents <noreply@keywise.app>",
      to,
      subject: `[Keywise] Daily agent digest — ${totalRuns} runs, ${pendingApprovals} pending`,
      html,
    });

    return { sent: true };
  } catch (err: any) {
    console.error("[digest] Failed:", err?.message || err);
    return { sent: false, error: err?.message || String(err) };
  }
}
