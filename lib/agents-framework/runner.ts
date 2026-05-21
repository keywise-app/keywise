// src/framework/runner.ts
import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentContext,
  AgentRole,
  AgentTask,
  AgentTool,
  Authority,
} from "./types";
import { createMemoryStore } from "./memory";
import { queueApproval, escalate } from "./approvals";
import { getBudgetStatus } from "./budget";

// Pricing as of May 2026 — used for cost tracking. Update if rates change.
const COST_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-7": { input: 15.0, output: 75.0 },
};

export interface RunOptions {
  trigger: "cron" | "manual" | "webhook";
  /** Optional override of the task's prompt (for ad-hoc admin runs) */
  promptOverride?: string;
  /** Optional metadata stored on the run row */
  metadata?: Record<string, unknown>;
}

export interface RunResult {
  runId: string;
  status: "success" | "awaiting_approval" | "failed";
  summary: string;
  costUsd: number;
}

export async function runAgent(
  role: AgentRole,
  taskId: string,
  supabase: any,
  anthropic: Anthropic,
  options: RunOptions
): Promise<RunResult> {
  const task = role.tasks[taskId];
  if (!task) throw new Error(`Unknown task ${taskId} for role ${role.id}`);

  const model =
    task.tier === "strategic" ? role.models.strategic : role.models.routine;

  // 1. Create the run row
  const { data: runRow, error: runErr } = await supabase
    .from("agent_runs")
    .insert({
      role: role.id,
      task: taskId,
      trigger: options.trigger,
      model,
      metadata: options.metadata ?? {},
    })
    .select("id")
    .single();
  if (runErr) throw runErr;

  const ctx: AgentContext = {
    runId: runRow.id,
    role: role.id,
    task: taskId,
    trigger: options.trigger,
    supabase,
    anthropic,
    memory: createMemoryStore(supabase, role.id),
    note: async (msg) => {
      await supabase.from("agent_actions").insert({
        run_id: runRow.id,
        role: role.id,
        tool: "_note",
        authority: "auto",
        status: "executed",
        reasoning: msg,
        input: {},
      });
    },
  };

  // 2. Check budget status
  const budget = await getBudgetStatus(supabase);
  const budgetContext = budget.capHit
    ? `\n\n⚠️ WEEKLY BUDGET CAP REACHED ($${budget.total}/$${budget.cap}). ALL actions will be force-escalated to Chris for approval regardless of normal authority levels. Do not attempt auto-execute actions — they will be escalated. Focus on analysis and recommendations only.`
    : `\n\n📊 Weekly budget: $${budget.total} of $${budget.cap} used ($${budget.remaining} remaining). Breakdown: Anthropic $${budget.anthropicSpend}, Twitter $${budget.twitterSpend}, Ad increases $${budget.adIncreaseSpend}.`;
  const today = new Date();
  const dateContext = `\n\nTODAY IS ${today.toISOString().slice(0, 10)} (${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' })} Pacific Time). Always use the current year in any content you produce; never write content referencing 2025 or earlier as "current" unless explicitly historical.`;
  const systemPrompt = role.systemPrompt + budgetContext + dateContext;

  // 3. Build the tool list visible to this task
  const allowed = task.toolNames
    ? role.tools.filter((t) => task.toolNames!.includes(t.name))
    : role.tools;

  const toolDefs: Anthropic.Tool[] = allowed.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  const rawPrompt =
    options.promptOverride ??
    (typeof task.prompt === "function" ? await task.prompt(ctx) : task.prompt);

  // If context_read tool is available, pre-read the file and inject into system prompt
  // (don't rely on the model calling the tool — it may parallelize past it)
  const contextTool = allowed.find((t) => t.name === "context_read");
  let contextAppendix = "";
  if (contextTool) {
    try {
      const result = await contextTool.execute({}, ctx);
      const content = (result as any)?.content;
      if (content && typeof content === "string" && content.length > 50) {
        contextAppendix = `\n\n--- KEYWISE CONTEXT DOCUMENT (authoritative — your drafts must comply) ---\n${content}\n--- END CONTEXT ---`;
      }
    } catch {
      // Non-fatal — context file missing or unreadable
    }
  }
  const fullSystemPrompt = systemPrompt + contextAppendix;
  const initialPrompt = rawPrompt;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: initialPrompt },
  ];

  let inputTokens = 0;
  let outputTokens = 0;
  let awaitingApproval = false;
  const maxIter = task.maxIterations ?? 10;

  // 3. Tool-use loop
  try {
    for (let i = 0; i < maxIter; i++) {
      const response = await callWithRetry(anthropic, {
        model,
        max_tokens: 4096,
        system: fullSystemPrompt,
        tools: toolDefs,
        messages,
      });

      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;

      // Append assistant message
      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "end_turn" || !hasToolUse(response)) {
        // Done
        const summary = extractText(response);
        await finalize(supabase, ctx.runId, {
          status: awaitingApproval ? "awaiting_approval" : "success",
          summary,
          inputTokens,
          outputTokens,
          model,
        });
        return {
          runId: ctx.runId,
          status: awaitingApproval ? "awaiting_approval" : "success",
          summary,
          costUsd: cost(model, inputTokens, outputTokens),
        };
      }

      // Handle tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const tool = allowed.find((t) => t.name === block.name);
        if (!tool) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Tool ${block.name} not available for this task`,
            is_error: true,
          });
          continue;
        }

        const input = block.input as any;
        const reasoning = extractTextBeforeTool(response, block.id);
        let authority = await resolveAuthority(tool, input, ctx);

        // Budget cap override — force escalate everything when cap is hit
        if (budget.capHit && authority !== "escalate") {
          authority = "escalate";
        }

        try {
          if (authority === "auto") {
            const out = await tool.execute(input, ctx);
            await logAction(supabase, ctx, tool, "auto", "executed", reasoning, input, out);
            // Tool results can be large (a single source file can be 50KB+).
            // Cap at 80KB (~20K tokens) so big files reach the agent intact
            // but a runaway tool can't blow the context window.
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(out).slice(0, 80_000),
            });
          } else if (authority === "approve") {
            const queued = await queueApproval(ctx, tool, input, reasoning);
            awaitingApproval = true;
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: `QUEUED FOR APPROVAL (id=${queued.id}). Estimated impact: ${queued.estimatedImpact ?? "unknown"}. Continue planning other actions; this one will execute after Chris approves.`,
            });
          } else {
            await escalate(ctx, tool, input, reasoning);
            awaitingApproval = true;
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: `ESCALATED to Chris. He'll respond directly. Continue with other actions you can take now.`,
            });
          }
        } catch (err: any) {
          await logAction(
            supabase,
            ctx,
            tool,
            authority,
            "failed",
            reasoning,
            input,
            { error: String(err?.message ?? err) }
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Tool failed: ${err?.message ?? err}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }

    // Hit iteration cap
    await finalize(supabase, ctx.runId, {
      status: "success",
      summary: `Hit max iterations (${maxIter}); stopping.`,
      inputTokens,
      outputTokens,
      model,
    });
    return {
      runId: ctx.runId,
      status: "success",
      summary: "Hit iteration cap",
      costUsd: cost(model, inputTokens, outputTokens),
    };
  } catch (err: any) {
    await finalize(supabase, ctx.runId, {
      status: "failed",
      summary: "",
      error: String(err?.message ?? err),
      inputTokens,
      outputTokens,
      model,
    });
    throw err;
  }
}

/**
 * Wraps anthropic.messages.create with exponential backoff for transient errors.
 * Retries on:
 *   529 (Overloaded) — Anthropic capacity is strained
 *   429 (Rate limited) — too many requests
 *   500-504 — generic server-side hiccups
 * Other errors throw immediately (your prompt is malformed, etc.).
 *
 * Backoff: 2s, 4s, 8s, 16s with jitter. Up to 5 attempts (~30s total wait).
 */
async function callWithRetry(
  anthropic: Anthropic,
  args: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  const maxAttempts = 5;
  let lastErr: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await anthropic.messages.create(args);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const retryable =
        status === 529 || status === 429 || (status >= 500 && status < 600);
      if (!retryable || attempt === maxAttempts - 1) {
        throw err;
      }
      lastErr = err;
      const backoffMs = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(
        `[runner] Anthropic ${status} on attempt ${attempt + 1}/${maxAttempts} — ` +
          `retrying in ${Math.round(backoffMs / 1000)}s`
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  // Unreachable, but TS wants a throw here
  throw lastErr;
}

async function resolveAuthority<TInput>(
  tool: AgentTool<TInput>,
  input: TInput,
  ctx: AgentContext
): Promise<Authority> {
  if (tool.resolveAuthority) {
    return tool.resolveAuthority(input, ctx);
  }
  return tool.defaultAuthority;
}

function hasToolUse(r: Anthropic.Message): boolean {
  return r.content.some((b) => b.type === "tool_use");
}

function extractText(r: Anthropic.Message): string {
  return r.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function extractTextBeforeTool(r: Anthropic.Message, toolId: string): string {
  const out: string[] = [];
  for (const b of r.content) {
    if (b.type === "tool_use" && b.id === toolId) break;
    if (b.type === "text") out.push(b.text);
  }
  return out.join("\n").trim();
}

function cost(model: string, input: number, output: number): number {
  const p = COST_PER_MTOK[model];
  if (!p) return 0;
  return (input / 1_000_000) * p.input + (output / 1_000_000) * p.output;
}

async function logAction(
  supabase: any,
  ctx: AgentContext,
  tool: AgentTool,
  authority: Authority,
  status: string,
  reasoning: string,
  input: any,
  result: any
) {
  await supabase.from("agent_actions").insert({
    run_id: ctx.runId,
    role: ctx.role,
    tool: tool.name,
    authority,
    status,
    reasoning,
    input,
    result,
    executed_at: status === "executed" ? new Date().toISOString() : null,
  });
}

async function finalize(
  supabase: any,
  runId: string,
  data: {
    status: string;
    summary: string;
    error?: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
  }
) {
  await supabase
    .from("agent_runs")
    .update({
      status: data.status,
      summary: data.summary,
      error: data.error,
      input_tokens: data.inputTokens,
      output_tokens: data.outputTokens,
      cost_usd: cost(data.model, data.inputTokens, data.outputTokens),
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
}
