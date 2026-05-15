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
// list_real_routes — walk app/ and return ONLY routes that actually exist.
// Replaces the old stub ux_audit_flow which hallucinated fake routes.
// ─────────────────────────────────────────────────────────────────

const APP_DIR = path.join(process.cwd(), "app");

// Files Next.js treats as a route's entry point.
const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js"];

interface RouteEntry {
  route: string;        // URL path, e.g. "/contact" or "/blog/[slug]"
  page_file: string;    // repo-relative path to page.tsx
  has_layout: boolean;  // whether a layout.tsx sits alongside
  is_dynamic: boolean;  // contains [param] segment
}

/**
 * Recursively walks app/ and returns every directory that contains a page file.
 * Honors Next.js conventions:
 *   - Folders wrapped in (parens) are route groups — stripped from URL
 *   - Folders starting with _ are private — skipped
 *   - Folders starting with @ are parallel route slots — skipped
 *   - [param] folders stay verbatim in the route
 */
function walkAppRoutes(): RouteEntry[] {
  const results: RouteEntry[] = [];

  function recurse(absDir: string, urlSegments: string[]) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    // Does this directory have a page file?
    const pageFile = PAGE_FILES.find((f) =>
      entries.some((e) => e.isFile() && e.name === f)
    );
    const hasLayout = entries.some(
      (e) => e.isFile() && /^layout\.(tsx?|jsx?)$/.test(e.name)
    );
    if (pageFile) {
      const route = "/" + urlSegments.filter(Boolean).join("/");
      const rel = path
        .relative(process.cwd(), path.join(absDir, pageFile))
        .replace(/\\/g, "/");
      results.push({
        route: route === "/" ? "/" : route.replace(/\/$/, ""),
        page_file: rel,
        has_layout: hasLayout,
        is_dynamic: urlSegments.some((s) => s.includes("[")),
      });
    }
    // Recurse into subdirectories
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const name = e.name;
      if (name.startsWith("_")) continue;     // private
      if (name.startsWith("@")) continue;     // parallel route slot
      if (name === "api") continue;           // API routes, not pages
      if (name === "node_modules") continue;
      // (group) folders don't contribute to URL
      const isRouteGroup = /^\(.+\)$/.test(name);
      const nextSegments = isRouteGroup ? urlSegments : [...urlSegments, name];
      recurse(path.join(absDir, name), nextSegments);
    }
  }

  recurse(APP_DIR, []);
  return results.sort((a, b) => a.route.localeCompare(b.route));
}

export const listRealRoutesTool: AgentTool<{}> = {
  name: "list_real_routes",
  description:
    "List every route that actually exists in the Keywise codebase by scanning app/ for page.tsx files. Always call this FIRST in any audit task. Routes returned here are the only routes you may propose changes against — proposing against a route not in this list will fail downstream because the Dev agent can't find files that don't exist.",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "List real routes in app/",
  execute: async () => {
    const routes = walkAppRoutes();
    return {
      count: routes.length,
      routes,
      note:
        "These are the ONLY valid affected_route values. If a flow you want to audit isn't here, the feature doesn't exist yet — skip it.",
    };
  },
};

export const readRouteFilesTool: AgentTool<{ route: string }> = {
  name: "read_route_files",
  description:
    "Read the page.tsx (and any obviously related co-located files) for a given route. Use this AFTER list_real_routes to see what the UX actually looks like before filing a proposal. The route argument must be a route returned by list_real_routes verbatim, e.g. '/contact' or '/blog/[slug]'.",
  inputSchema: {
    type: "object",
    properties: {
      route: {
        type: "string",
        description: "Route as returned by list_real_routes, e.g. '/contact'.",
      },
    },
    required: ["route"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Read files for route ${i.route}`,
  execute: async (i) => {
    const routes = walkAppRoutes();
    const match = routes.find((r) => r.route === i.route);
    if (!match) {
      return {
        error: `Route "${i.route}" does not exist in the app/. Call list_real_routes to see valid routes.`,
        valid_routes: routes.map((r) => r.route),
      };
    }
    const absPagePath = path.join(process.cwd(), match.page_file);
    let pageContent = "";
    try {
      pageContent = fs.readFileSync(absPagePath, "utf-8");
    } catch (err: any) {
      return { error: `Could not read ${match.page_file}: ${err?.message || err}` };
    }
    // Also list peer files in the same directory (often co-located components)
    const peerDir = path.dirname(absPagePath);
    let peers: string[] = [];
    try {
      peers = fs
        .readdirSync(peerDir, { withFileTypes: true })
        .filter((e) => e.isFile() && !PAGE_FILES.includes(e.name))
        .map((e) =>
          path
            .relative(process.cwd(), path.join(peerDir, e.name))
            .replace(/\\/g, "/")
        );
    } catch {
      // ignore
    }
    return {
      route: match.route,
      page_file: match.page_file,
      page_content: pageContent.length > 12000
        ? pageContent.slice(0, 12000) + "\n\n... [truncated; file is " + pageContent.length + " chars total]"
        : pageContent,
      page_size: pageContent.length,
      has_layout: match.has_layout,
      is_dynamic: match.is_dynamic,
      peer_files: peers,
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
      flow: { type: "string", description: "A user-flow name to compare. Loose string — e.g. 'add_property', 'rent_renewal', 'contact'. Stub data only covers a handful." },
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
  listRealRoutesTool,
  readRouteFilesTool,
  productProposeTool,
  readSupportTicketsTool,
  competitorUxScrapeTool,
  readUserActionsTool,
];
