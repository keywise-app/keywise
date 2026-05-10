// src/tools/supabase/tools.ts
// Read-only analytics queries against the Keywise DB. Always 'auto'.
// Add more queries as the agents need them.

import type { AgentTool } from "@/agents-framework/types";

export const funnelMetricsTool: AgentTool<{ days?: number }> = {
  name: "kw_funnel_metrics",
  description:
    "Get the Keywise signup funnel for the last N days: ad_clicks → landing_visits → signups_started → signups_completed → activated → paid.",
  inputSchema: {
    type: "object",
    properties: { days: { type: "number" } },
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Funnel metrics (${i.days ?? 7}d)`,
  execute: async (i, ctx) => {
    const days = i.days ?? 7;
    // Using a hypothetical RPC that joins ads + analytics + users tables.
    // Replace with whatever your actual schema needs.
    const { data, error } = await ctx.supabase.rpc("get_funnel_metrics", { days });
    if (error) {
      // Fall back to a stub so the agent can still reason in dev
      return {
        days,
        ad_clicks: 142,
        landing_visits: 130,
        signups_started: 18,
        signups_completed: 9,
        activated: 4,
        paid: 1,
        note: "stub data — wire get_funnel_metrics RPC in Supabase",
      };
    }
    return data;
  },
};

export const recentSignupsTool: AgentTool<{ limit?: number }> = {
  name: "kw_recent_signups",
  description: "Get the most recent signups with their activation status (no PII beyond email domain).",
  inputSchema: {
    type: "object",
    properties: { limit: { type: "number" } },
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Recent ${i.limit ?? 20} signups`,
  execute: async (i, ctx) => {
    const { data, error } = await ctx.supabase
      .from("users")
      .select("id, email, created_at, activated_at, units_count, plan")
      .order("created_at", { ascending: false })
      .limit(i.limit ?? 20);
    if (error) throw error;
    return {
      signups: (data ?? []).map((u: any) => ({
        domain: String(u.email).split("@")[1],
        signedUp: u.created_at,
        activated: !!u.activated_at,
        units: u.units_count,
        plan: u.plan,
      })),
    };
  },
};

export const allKwTools = [funnelMetricsTool, recentSignupsTool];
