// lib/agent-tools/product/tools.ts
// Tools for the CPO to audit user flows, read user signals, and write product proposals.
// Most are stubs today — wire to real data sources as they come online.

import type { AgentTool } from "@/agents-framework/types";
import { cpoConfig } from "@/agents/cpo/config";

// ─────────────────────────────────────────────────────────────────
// CPO context reader — reads lib/agents/cpo/context.md at runtime
// (the CMO's contextReadTool reads the CMO file; the CPO needs its own.)
// ─────────────────────────────────────────────────────────────────
import * as fs from "fs";
import * as path from "path";

const CPO_CONTEXT_PATH = path.join(
  process.cwd(),
  "lib",
  "agents",
  "cpo",
  "context.md"
);

export const cpoContextReadTool: AgentTool<{}> = {
  name: "cpo_context_read",
  description:
    "Read the Keywise CPO context document — ICP, the 5 UX principles, what good looks like, what's been tried, proposal checklist. Call this ONCE at the start of every run before doing substantive work.",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "Read CPO context document",
  execute: async () => {
    try {
      const content = fs.readFileSync(CPO_CONTEXT_PATH, "utf-8");
      return { content, chars: content.length };
    } catch (err: any) {
      return {
        content: "",
        error: "Could not read CPO context file: " + (err?.message || err),
      };
    }
  },
};

// ─────────────────────────────────────────────────────────────────
// ux_audit_flow — walk a specific flow and surface friction
// Stub today; wire to a real route-walker (Playwright?) later.
// ─────────────────────────────────────────────────────────────────
export const uxAuditFlowTool: AgentTool<{ flow_name: string }> = {
  name: "ux_audit_flow",
  description:
    "Audit one user-facing flow end-to-end. Returns the screens in the flow, the actions on each, friction hypotheses, and any drop-off data we have. Use this as the starting point for daily_flow_audit and monthly_competitive_ux_audit.",
  inputSchema: {
    type: "object",
    properties: {
      flow_name: {
        type: "string",
        description: `One of: ${cpoConfig.auditFlows.join(", ")}`,
      },
    },
    required: ["flow_name"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `UX audit: ${i.flow_name}`,
  execute: async (i) => {
    // Stub: return a structured walkthrough. Replace with real route-walker.
    const stubs: Record<string, any> = {
      signup: {
        screens: [
          { route: "/signup", primary_action: "Create account", fields: 4 },
          { route: "/signup/units", primary_action: "Pick unit count", fields: 1 },
          { route: "/dashboard", primary_action: "Add first property", fields: 0 },
        ],
        friction_points: [
          "44% activation rate — landlords sign up but don't add a property",
          "No back button on /signup/units",
          "Dashboard doesn't reflect what user signed up for (free vs Pro)",
        ],
        drop_off_estimate: "~56% between signup and first property",
      },
      add_property: {
        screens: [
          { route: "/properties/new", primary_action: "Save property", fields: 7 },
        ],
        friction_points: [
          "7 required fields on one screen — RentRedi gets to value in 3",
          "Address autocomplete is opt-in; should be default",
          "No way to bulk-import properties from CSV",
        ],
        drop_off_estimate: "unknown — no telemetry on /properties/new yet",
      },
      fmv_calculation: {
        screens: [
          { route: "/properties/[id]/fmv", primary_action: "Calculate FMV", fields: 0 },
        ],
        friction_points: [
          "AI returns a single number with no explanation of inputs",
          "User cannot adjust property condition or sqft before recalculating",
          "No 'override' field if user disagrees with AI",
        ],
        drop_off_estimate: "n/a — but 31% of users never run FMV after seeing it once",
      },
      rent_renewal: {
        screens: [
          { route: "/leases/[id]/renew", primary_action: "Send renewal", fields: 0 },
        ],
        friction_points: [
          "AI suggests increase % but doesn't show the resulting rent in dollars until after Send",
          "No recall after send — landlord stuck if increase was wrong",
        ],
        drop_off_estimate: "unknown",
      },
    };
    const data = stubs[i.flow_name] ?? {
      screens: [],
      friction_points: [
        `No audit data yet for "${i.flow_name}". Stub returns empty — wire a real route-walker.`,
      ],
      drop_off_estimate: "unknown",
    };
    return {
      flow_name: i.flow_name,
      ...data,
      note: "stub data — wire real audit (Playwright + telemetry) before relying on this for shipping",
    };
  },
};

// ─────────────────────────────────────────────────────────────────
// product_propose — write a proposal to product_proposals table
// This is the CPO's primary output. Every proposal needs human review.
// ─────────────────────────────────────────────────────────────────
type Severity = "critical" | "high" | "medium" | "low";

export const productProposeTool: AgentTool<{
  title: string;
  description: string;
  severity: Severity;
  affected_route: string;
}> = {
  name: "product_propose",
  description:
    "File a product improvement proposal for Chris to review. Writes to product_proposals table. Title must be verb-first and ≤80 chars. Description must be markdown with three sections: Friction / Proposed change / Why this matters (one of the 5 principles + estimated impact). Severity: critical (blocking, escalates), high (top-10 flow friction), medium (workaroundable), low (polish). One proposal per change — don't bundle.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Verb-first, specific, ≤80 chars",
      },
      description: {
        type: "string",
        description:
          "Markdown with three sections: **Friction**, **Proposed change**, **Why this matters**",
      },
      severity: {
        type: "string",
        enum: ["critical", "high", "medium", "low"],
      },
      affected_route: {
        type: "string",
        description: "Exact Next.js route, e.g. /properties/[id]/fmv",
      },
    },
    required: ["title", "description", "severity", "affected_route"],
  },
  defaultAuthority: cpoConfig.defaultProposalAuthority,
  resolveAuthority: (input) => {
    // Critical severity OR any breaking-change keyword → escalate
    if (input.severity === "critical") return "escalate";
    const haystack = (input.title + " " + input.description).toLowerCase();
    for (const kw of cpoConfig.breakingChangeKeywords) {
      if (haystack.includes(kw.toLowerCase())) return "escalate";
    }
    return cpoConfig.defaultProposalAuthority;
  },
  describeAction: (i) => `Propose: "${i.title}" (${i.severity}, ${i.affected_route})`,
  estimateImpact: (i) => `${i.severity} severity on ${i.affected_route}`,
  execute: async (i, ctx) => {
    if (i.title.length > 80) {
      throw new Error(`Title is ${i.title.length} chars — keep it ≤80.`);
    }
    const { data, error } = await ctx.supabase
      .from("product_proposals")
      .insert({
        title: i.title,
        description: i.description,
        severity: i.severity,
        affected_route: i.affected_route,
        status: "proposed",
        proposed_by_agent: "cpo",
      })
      .select("id")
      .single();
    if (error) throw error;
    return {
      proposalId: data.id,
      reviewUrl: "/admin/agents/product-proposals",
    };
  },
};

// ─────────────────────────────────────────────────────────────────
// read_support_tickets — stub for now; wire to real support inbox later
// ─────────────────────────────────────────────────────────────────
export const readSupportTicketsTool: AgentTool<{ days?: number }> = {
  name: "read_support_tickets",
  description:
    "Read recent support tickets to find friction patterns. Returns subject, body excerpt, sentiment, and any flow tags. Use in weekly_friction_synthesis.",
  inputSchema: {
    type: "object",
    properties: {
      days: { type: "number", description: "Look-back window (default 7)" },
    },
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Read support tickets (${i.days ?? 7}d)`,
  execute: async (i) => {
    const days = i.days ?? 7;
    // Stub: a few representative tickets. Wire to real inbox (Resend/Helpscout/etc) later.
    return {
      days,
      tickets: [
        {
          id: "tkt_stub_1",
          subject: "How do I undo sending a lease?",
          body_excerpt:
            "I sent the renewal to the wrong tenant — there's no way to recall it. Help.",
          sentiment: "frustrated",
          flow_tag: "send_lease",
          created_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
        },
        {
          id: "tkt_stub_2",
          subject: "FMV way too low for my unit",
          body_excerpt:
            "Keywise says my 2-bed is worth $1,400. Comparable units rent for $1,800. Can I change the inputs?",
          sentiment: "confused",
          flow_tag: "fmv_calculation",
          created_at: new Date(Date.now() - 4 * 86400_000).toISOString(),
        },
        {
          id: "tkt_stub_3",
          subject: "Stuck on signup step 2",
          body_excerpt:
            "I picked 8 units but it won't let me go back to fix the email I typed.",
          sentiment: "stuck",
          flow_tag: "signup",
          created_at: new Date(Date.now() - 6 * 86400_000).toISOString(),
        },
      ],
      note: "stub data — wire to real support inbox (Resend received, support@ alias) before relying on this",
    };
  },
};

// ─────────────────────────────────────────────────────────────────
// competitor_ux_scrape — stub for monthly competitive audit
// ─────────────────────────────────────────────────────────────────
export const competitorUxScrapeTool: AgentTool<{
  competitor: "rentredi" | "buildium";
  flow: string;
}> = {
  name: "competitor_ux_scrape",
  description:
    "Compare a competitor's flow to Keywise's. Returns the competitor's screens, what they do well, where they're worse. Use in monthly_competitive_ux_audit.",
  inputSchema: {
    type: "object",
    properties: {
      competitor: { type: "string", enum: ["rentredi", "buildium"] },
      flow: { type: "string", description: `One of: ${cpoConfig.auditFlows.join(", ")}` },
    },
    required: ["competitor", "flow"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Competitor UX: ${i.competitor} / ${i.flow}`,
  execute: async (i) => {
    // Stub: realistic-looking comparisons. Wire to scraper or manual review later.
    const knownGood: Record<string, Record<string, any>> = {
      rentredi: {
        add_property: {
          screens: 1,
          fields_to_complete: 3,
          pros: ["3-field initial property entry (vs our 7)", "Address autocomplete on by default"],
          cons: ["No AI assist", "No way to add unit photos at this step"],
          differentiators_we_have: ["AI lease extraction once a unit exists"],
        },
        signup: {
          screens: 2,
          fields_to_complete: 5,
          pros: ["Single-screen account creation"],
          cons: ["No segmentation by unit count → generic dashboard on first load"],
          differentiators_we_have: ["Unit-count-based onboarding path"],
        },
      },
      buildium: {
        rent_renewal: {
          screens: 4,
          fields_to_complete: 12,
          pros: [
            "Undo button on every step",
            "30-day soft-delete on every record",
            "Clear preview of the renewed lease as PDF before send",
          ],
          cons: ["Way too dense for a 4-10 unit landlord", "No AI suggestion at all"],
          differentiators_we_have: ["AI-suggested rent increase with reasoning"],
        },
      },
    };
    const data = knownGood[i.competitor]?.[i.flow] ?? {
      screens: null,
      fields_to_complete: null,
      pros: [],
      cons: [`No stub data for ${i.competitor}/${i.flow}. Add manually or wire a scraper.`],
      differentiators_we_have: [],
    };
    return {
      competitor: i.competitor,
      flow: i.flow,
      ...data,
      note: "stub data — wire real competitor scraper or manual review before relying on this",
    };
  },
};

// ─────────────────────────────────────────────────────────────────
// read_user_actions — query agent_actions table for behavior patterns
// (Real query; wire user_events later when telemetry exists.)
// ─────────────────────────────────────────────────────────────────
export const readUserActionsTool: AgentTool<{ days?: number }> = {
  name: "read_user_actions",
  description:
    "Query recent user-affecting actions from the agent_actions table to spot patterns (which routes are touched, which errors recur). Use in weekly_friction_synthesis and weekly_ai_human_balance_review.",
  inputSchema: {
    type: "object",
    properties: {
      days: { type: "number", description: "Look-back window (default 7)" },
    },
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Read user actions (${i.days ?? 7}d)`,
  execute: async (i, ctx) => {
    const days = i.days ?? 7;
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const { data, error } = await ctx.supabase
      .from("agent_actions")
      .select("id, role, tool, status, reasoning, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      return {
        days,
        actions: [],
        error: error.message,
        note: "agent_actions query failed — check schema and RLS",
      };
    }
    // Aggregate by tool to surface patterns
    const byTool: Record<string, number> = {};
    for (const row of data ?? []) {
      byTool[row.tool] = (byTool[row.tool] ?? 0) + 1;
    }
    return {
      days,
      total: data?.length ?? 0,
      by_tool: byTool,
      recent: (data ?? []).slice(0, 20),
    };
  },
};

export const allProductTools = [
  cpoContextReadTool,
  uxAuditFlowTool,
  productProposeTool,
  readSupportTicketsTool,
  competitorUxScrapeTool,
  readUserActionsTool,
];
