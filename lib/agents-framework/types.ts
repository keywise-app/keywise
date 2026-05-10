// src/framework/types.ts
import type Anthropic from "@anthropic-ai/sdk";

export type Authority = "auto" | "approve" | "escalate";

export type ToolAuthorityResolver<TInput> = (
  input: TInput,
  ctx: AgentContext
) => Authority | Promise<Authority>;

export interface AgentTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool.InputSchema;
  /** Default authority if resolver returns nothing */
  defaultAuthority: Authority;
  /** Per-call authority logic (e.g. "auto if spend < $50, else approve") */
  resolveAuthority?: ToolAuthorityResolver<TInput>;
  /** Cheap human-readable summary for logs and approval cards */
  describeAction: (input: TInput) => string;
  /** Optional impact estimate shown in approvals/logs */
  estimateImpact?: (input: TInput, ctx: AgentContext) => string | Promise<string>;
  /** Run the side effect. Only called when authority resolves to 'auto' or after approval. */
  execute: (input: TInput, ctx: AgentContext) => Promise<TOutput>;
}

export interface AgentRole {
  id: string;                          // 'cmo', 'cro', 'product', ...
  title: string;                       // 'Chief Marketing Officer'
  systemPrompt: string;
  /** Model tier per task. Haiku for routine, Sonnet for strategy. */
  models: {
    routine: string;                   // e.g. 'claude-haiku-4-5-20251001'
    strategic: string;                 // e.g. 'claude-sonnet-4-6'
  };
  tools: AgentTool[];
  tasks: Record<string, AgentTask>;
}

export interface AgentTask {
  id: string;                          // 'daily_audit', 'weekly_seo'
  description: string;                 // shown in logs and admin
  /** Which model to use for this task */
  tier: "routine" | "strategic";
  /** Initial prompt the agent sees when this task fires */
  prompt: string | ((ctx: AgentContext) => string | Promise<string>);
  /** Subset of role.tools available for this task; default = all */
  toolNames?: string[];
  /** Stop after N tool-use rounds (safety) */
  maxIterations?: number;
}

export interface AgentContext {
  runId: string;
  role: string;
  task: string;
  trigger: "cron" | "manual" | "webhook";
  supabase: any;                       // SupabaseClient — leaving 'any' to keep this self-contained
  anthropic: Anthropic;
  /** Read/write long-term memory for this role */
  memory: MemoryStore;
  /** Log a custom note (separate from tool actions) */
  note: (msg: string) => Promise<void>;
}

export interface MemoryStore {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, importance?: number): Promise<void>;
  list(prefix: string): Promise<Array<{ key: string; value: any }>>;
}
