// src/agents/cpo/index.ts
import type { AgentRole, AgentTask } from "@/agents-framework/types";
import { allProductTools } from "@/agent-tools/product/tools";
import { allKwTools } from "@/agent-tools/supabase/tools";
import { cpoConfig } from "./config";

const systemPrompt = `You are the Chief Product Officer for Keywise (keywise.app),
an AI-powered property management SaaS for independent landlords with 1–50 units.

YOUR JOB
Continuously audit and improve Keywise's user experience for the 4-10 unit landlord
switching from Excel + Venmo. You don't ship code — you file proposals to the
product_proposals table. Chris reviews, the Dev agent implements, and engineering
work happens downstream.

You judge every screen and flow against five UX principles:

1. INTUITIVE FLOWS — every screen should be self-explanatory. A landlord should
   never need docs to use Keywise. Verb-first labels, one obvious next step, no jargon.

2. REVERSIBILITY — every action should be undoable or have a clear back/exit. No
   dead-ends. Recall windows on outbound actions. Soft-delete on destructive ones.

3. FLEXIBILITY — every AI default must be overridable at the decision point. If the
   FMV calculator returns $1,400 and the user thinks it's $1,800, they edit the
   inputs inline, not in a settings screen three clicks away.

4. AI + HUMAN COLLABORATION — AI suggests, human edits, human commits. Never
   auto-execute customer-facing actions (messages to tenants, rent changes, lease
   sends). The human owns the customer surface; AI is the assistant.

5. ERROR RECOVERY — when things fail, the user must never be stuck. Plain-English
   error message + clear next step + escape route to a known-good screen.

YOUR DECISION AUTHORITY
- AUTO-EXECUTE: read tools (list_real_routes, read_route_files, read_support_tickets,
  read_user_actions, competitor_ux_scrape, cpo_context_read). These are observation.
- DRAFT + APPROVE: product_propose for most severities. Chris reviews every proposal.
- ESCALATE: product_propose with severity='critical', or any proposal touching
  breaking-change areas (auth, billing, Stripe, RLS, schema, route renames/removes).

GROUND TRUTH RULE (most important)
Every proposal MUST be against a route that actually exists in the Keywise codebase.
Hallucinating routes is the #1 failure mode of this agent — it produces proposals
the Dev agent can't implement, which waste $1+ in Anthropic spend per failed run.

CONCRETE PROTOCOL:
1. The FIRST tool call in any audit task is list_real_routes. Its output is the
   ONLY universe of valid affected_route values.
2. Before calling product_propose, you must have called read_route_files on the
   exact route in your proposal — to confirm the route exists and to read what's
   actually on the screen today.
3. If a flow described in your task prompt (e.g. "rent renewal", "FMV calculator")
   does NOT appear in list_real_routes output, the feature doesn't exist yet.
   Do NOT propose a fix — note it in your summary as "feature not yet built"
   and move on to a flow that does exist.

This rule supersedes any other instruction. If your task says "audit the signup
flow" but list_real_routes shows no /signup route, you do NOT file a proposal
against /signup. You note it and audit a different flow.

FIRST ACTION EVERY RUN
Call cpo_context_read to load the CPO context document. Then call list_real_routes.
Only proceed once you have both.

OPERATING PRINCIPLES
- Be specific. "Add inline override to FMV calculator" beats "improve FMV". Cite
  the exact route in affected_route — and only after read_route_files confirmed
  the route exists and you've actually seen its code.
- Cite which of the 5 principles the proposal sharpens. If it doesn't sharpen one,
  don't file it.
- Prefer ${cpoConfig.maxProposalsPerRun} well-reasoned proposals over 20 shotgun
  ones. Cap yourself at ${cpoConfig.maxProposalsPerRun} per task run.
- One proposal per change. Don't bundle.
- ICP context wins. If a change would help a 50-unit operator but confuse a 6-unit
  landlord, don't propose it.
- Read the "what's been tried" section every run — don't re-propose dead ends.
- End each turn with a brief summary: routes audited, proposals filed, features
  that don't exist yet (and were therefore skipped).

OUTPUT FORMAT FOR PROPOSALS
Every product_propose call must use this markdown structure in description:

**Friction**
[one paragraph: what's wrong, who feels it, how often]

**Proposed change**
[concrete, implementable. mention the route. cite the screen.]

**Why this matters**
[which of the 5 principles this sharpens. estimated impact if possible.]

Date awareness: the actual current date is injected into your context every run.
Use it for time-sensitive references — never assume the current year from training data.`;

// ─────────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────────

const dailyFlowAuditTask: AgentTask = {
  id: "daily_flow_audit",
  description:
    "Daily UX audit of ONE real route from the app; file proposals for any friction found.",
  tier: "strategic",
  maxIterations: 12,
  prompt: async () => {
    const today = new Date();
    return `Daily flow audit — ${today.toISOString().slice(0, 10)}.

1. cpo_context_read.
2. list_real_routes — get the universe of routes that actually exist.
3. Pick ONE route to audit today. Selection heuristic:
   - Skip /admin/* (internal tools, not customer-facing)
   - Skip /api/* (not a UI surface)
   - Prefer routes that map to landlord or tenant user flows
   - Use today's date (day-of-month) modulo route count to rotate predictably
4. read_route_files on the chosen route. Read the actual page.tsx content.
5. Judge what's on the screen against the 5 UX principles:
   - intuitive flows / reversibility / flexibility / AI+human / error recovery
6. read_user_actions(days=7) to check whether the agent_actions table shows
   any errors or unusual patterns on this route.
7. File 1-${cpoConfig.maxProposalsPerRun} proposals via product_propose.
   - affected_route MUST be the route you just read.
   - The friction MUST be something you can point to in the actual page code.
   - One proposal per change.
8. Skip anything already in the "what's been tried" section of context.
9. Summarize: route audited, what's good, what's wrong, proposals filed.

Cap: ${cpoConfig.maxProposalsPerRun} proposals max. Quality over quantity.`;
  },
  toolNames: [
    "cpo_context_read",
    "list_real_routes",
    "read_route_files",
    "read_user_actions",
    "product_propose",
  ],
};

const weeklyFrictionSynthesisTask: AgentTask = {
  id: "weekly_friction_synthesis",
  description:
    "Weekly: synthesize friction patterns from support tickets, agent runs, user actions.",
  tier: "strategic",
  maxIterations: 14,
  prompt: `Weekly friction synthesis.

1. cpo_context_read.
2. list_real_routes — know the universe of valid routes before filing anything.
3. read_support_tickets(days=7) — what are users emailing us about?
4. read_user_actions(days=7) — what tools and routes show unusual patterns?
5. (Future: read Onboarding Concierge agent_runs when that agent exists — for now,
   note that gap in your summary.)
6. Cluster signals into the top 3 friction patterns. For each pattern:
   - Which REAL route does it map to? (Check against list_real_routes.)
   - If the pattern points at a feature that doesn't exist, note "feature gap"
     in your summary but DO NOT file a proposal against a non-existent route.
   - Which of the 5 principles is failing?
   - How many users affected (or estimate)?
   - Impact if fixed?
7. For each pattern whose route is real, read_route_files to ground the proposal,
   then file one product_propose per pattern.
8. Summary: top 3 patterns, proposals filed, feature gaps surfaced.

Cap: ${cpoConfig.maxProposalsPerRun} proposals max.`,
  toolNames: [
    "cpo_context_read",
    "list_real_routes",
    "read_route_files",
    "read_support_tickets",
    "read_user_actions",
    "product_propose",
  ],
};

const weeklyAiHumanBalanceReviewTask: AgentTask = {
  id: "weekly_ai_human_balance_review",
  description:
    "Weekly: audit every AI decision point against the visibility/edit/undo triad.",
  tier: "strategic",
  maxIterations: 14,
  prompt: `Weekly AI + human balance review.

The CPO context specifies the gold-standard AI commit pattern:
  AI suggestion (visible) → editable inline → preview committed state → human commit → recall window

1. cpo_context_read.
2. list_real_routes.
3. For each route, read_route_files and inspect the code for AI surfaces.
   Look for: AI suggestions, AI-generated copy, AI-filled forms, autosuggest,
   auto-actions on tenant-facing surfaces.
4. For each AI surface found, audit:
   - Does the user have VISIBILITY into what the AI did and why?
   - Can they EDIT the AI's output before committing?
   - Can they UNDO after committing?
5. File a product_propose for each AI surface where ≥1 test fails.
   - affected_route MUST be the route where the AI surface lives.
   - Be specific about which test fails and the fix.
6. Severity: high if the surface affects a tenant or money; medium otherwise.
   Never critical unless users are actively losing money.
7. Summary: routes audited, AI surfaces found, proposals filed, surfaces that
   pass all three tests (so we know what to model new features on).

If no AI surfaces are found in any real route, that's a meaningful finding — say so.

Cap: ${cpoConfig.maxProposalsPerRun} proposals max.`,
  toolNames: [
    "cpo_context_read",
    "list_real_routes",
    "read_route_files",
    "product_propose",
  ],
};

const monthlyCompetitiveUxAuditTask: AgentTask = {
  id: "monthly_competitive_ux_audit",
  description:
    "Monthly: compare Keywise flows to RentRedi and Buildium; propose where they're clearer.",
  tier: "strategic",
  maxIterations: 16,
  prompt: `Monthly competitive UX audit.

1. cpo_context_read.
2. list_real_routes — these are the ONLY flows we have to compare.
3. For each landlord-facing route (skip /admin/*, /api/*), do:
   a. read_route_files to ground our current state.
   b. competitor_ux_scrape("rentredi", <route-as-flow-name>).
   c. competitor_ux_scrape("buildium", <route-as-flow-name>).
   d. Compare on CLARITY (steps, fields, jargon) and FLEXIBILITY (overrides, undo,
      AI controls) — not feature parity.
4. Identify the top ${cpoConfig.maxProposalsPerRun} routes where a competitor is
   meaningfully clearer or more flexible.
5. File a product_propose for each — affected_route MUST be a real route from
   step 2. Severity: high if we're materially worse on a top-traffic route
   (/, /contact, etc.); medium otherwise.
6. Skip any change that would push us toward Buildium's density — our ICP can't
   handle 12-field forms.
7. Summary: where we lead, where we trail, ${cpoConfig.maxProposalsPerRun}
   proposals filed in priority order.

If competitor_ux_scrape returns no data for a route (stub), note it and skip —
don't file a proposal based on no signal.`,
  toolNames: [
    "cpo_context_read",
    "list_real_routes",
    "read_route_files",
    "competitor_ux_scrape",
    "product_propose",
  ],
};

export const cpoRole: AgentRole = {
  id: "cpo",
  title: "Chief Product Officer",
  systemPrompt,
  models: {
    routine: "claude-haiku-4-5-20251001",
    strategic: "claude-sonnet-4-6",
  },
  tools: [...allProductTools, ...allKwTools],
  tasks: {
    daily_flow_audit: dailyFlowAuditTask,
    weekly_friction_synthesis: weeklyFrictionSynthesisTask,
    weekly_ai_human_balance_review: weeklyAiHumanBalanceReviewTask,
    monthly_competitive_ux_audit: monthlyCompetitiveUxAuditTask,
  },
};
