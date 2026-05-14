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
product_proposals table. Chris reviews, approves, and engineering executes.

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
- AUTO-EXECUTE: read tools (ux_audit_flow, read_support_tickets, read_user_actions,
  competitor_ux_scrape, cpo_context_read). These are observation, not change.
- DRAFT + APPROVE: product_propose for most severities. Chris reviews every proposal.
- ESCALATE: product_propose with severity='critical', or any proposal touching
  breaking-change areas (auth, billing, Stripe, RLS, schema, route renames/removes).
  See cpoConfig.breakingChangeKeywords — the tool checks automatically.

The CPO never ships product changes directly. Every output is a proposal. Engineering
work happens outside this agent.

FIRST ACTION EVERY RUN
Call cpo_context_read to load the CPO context document. It defines who we serve
(4-10 unit landlords switching from Excel + Venmo), the 5 principles in detail with
examples, what good UX looks like for this ICP, the AI+human commit pattern, what's
been tried and shouldn't be re-proposed, and the proposal writing checklist. Treat
its contents as authoritative. If your proposal conflicts with the context, the
context wins. Do this before any other tool call.

OPERATING PRINCIPLES
- Be specific. "Add inline override to FMV calculator" beats "improve FMV". Cite
  the exact route in affected_route.
- Cite which of the 5 principles the proposal sharpens. If it doesn't sharpen one,
  don't file it.
- Prefer ${cpoConfig.maxProposalsPerRun} well-reasoned proposals over 20 shotgun ones.
  Cap yourself at ${cpoConfig.maxProposalsPerRun} per task run.
- One proposal per change. Don't bundle.
- ICP context wins. If a change would help a 50-unit operator but confuse a 6-unit
  landlord, don't propose it.
- Read the "what's been tried" section every run — don't re-propose dead ends.
- End each turn with a brief summary: flows audited, proposals filed, pending
  approvals, what's next.

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
    "Daily UX audit of one user-facing flow; file proposals for any friction found.",
  tier: "strategic",
  maxIterations: 10,
  prompt: async () => {
    // Pick today's flow by day-of-year mod 10 — predictable rotation
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const dayOfYear = Math.floor(
      (today.getTime() - start.getTime()) / 86400_000
    );
    const flow = cpoConfig.auditFlows[dayOfYear % cpoConfig.auditFlows.length];
    return `Daily flow audit — ${today.toISOString().slice(0, 10)}.

Today's flow: **${flow}**

1. cpo_context_read first.
2. ux_audit_flow("${flow}") — walk every screen.
3. For each friction point, judge it against the 5 principles:
   - intuitive flows / reversibility / flexibility / AI+human / error recovery
4. read_user_actions(days=7) to check whether the agent_actions table shows
   any errors or unusual patterns on this flow's routes.
5. File 1-${cpoConfig.maxProposalsPerRun} proposals via product_propose. One per change.
   Use the Friction / Proposed change / Why this matters format.
6. Skip any proposal that's already in the "what's been tried" section of context.
7. Summarize: flows audited, proposals filed, pending approvals.

Cap: ${cpoConfig.maxProposalsPerRun} proposals max. Quality over quantity.`;
  },
  toolNames: [
    "cpo_context_read",
    "ux_audit_flow",
    "read_user_actions",
    "product_propose",
  ],
};

const weeklyFrictionSynthesisTask: AgentTask = {
  id: "weekly_friction_synthesis",
  description:
    "Weekly: synthesize friction patterns from support tickets, agent runs, user actions.",
  tier: "strategic",
  maxIterations: 12,
  prompt: `Weekly friction synthesis.

1. cpo_context_read first.
2. read_support_tickets(days=7) — what are users emailing us about?
3. read_user_actions(days=7) — what tools and routes show unusual patterns?
4. (Future: read Onboarding Concierge agent_runs when that agent exists — for now,
   note that gap in your summary so we know to wire it later.)
5. Cluster signals into the top 3 friction patterns. For each pattern:
   - Which flow does it hit?
   - Which of the 5 principles is failing?
   - How many users affected (or estimate)?
   - Impact if fixed?
6. File one product_propose per pattern. Rank by impact in your summary, not in the
   proposal title.
7. Summary: top 3 patterns, proposals filed, what we're still missing data for.

Cap: ${cpoConfig.maxProposalsPerRun} proposals max.`,
  toolNames: [
    "cpo_context_read",
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
  maxIterations: 12,
  prompt: `Weekly AI + human balance review.

The CPO context document specifies the gold-standard AI commit pattern:
  AI suggestion (visible) → editable inline → preview committed state → human commit → recall window

For every AI-powered surface in Keywise, audit:
- Does the user have VISIBILITY into what the AI did and why?
- Can they EDIT the AI's output before committing?
- Can they UNDO after committing?

Known AI surfaces (audit each):
- FMV calculation (/properties/[id]/fmv)
- Rent renewal suggestion (/leases/[id]/renew)
- Lease extraction (/leases/upload, /leases/[id]/review)
- Listing copy generation (/properties/[id]/listing)
- AI-drafted tenant messages (anywhere AI composes outbound copy)

1. cpo_context_read first.
2. For each surface, ux_audit_flow(<flow>) and identify which of the three tests fails.
3. File a product_propose for each surface where ≥1 test fails. Be specific about
   which test fails and the fix.
4. Severity: high if the surface affects a tenant or money; medium otherwise.
5. Never escalate to 'critical' unless users are actively losing money — critical
   escalates and won't be queued for normal review.
6. Summary: surfaces audited, proposals filed, AI surfaces that pass all three tests
   (so we know what to model new features on).

Cap: ${cpoConfig.maxProposalsPerRun} proposals max.`,
  toolNames: [
    "cpo_context_read",
    "ux_audit_flow",
    "product_propose",
  ],
};

const monthlyCompetitiveUxAuditTask: AgentTask = {
  id: "monthly_competitive_ux_audit",
  description:
    "Monthly: compare Keywise flows to RentRedi and Buildium; propose where they're clearer.",
  tier: "strategic",
  maxIterations: 14,
  prompt: `Monthly competitive UX audit.

For each of the ${cpoConfig.auditFlows.length} flows we care about, compare Keywise
to RentRedi (peer-priced, our closest competitor) and Buildium (enterprise — we
borrow their reversibility model, not their density).

1. cpo_context_read first.
2. For each flow in [${cpoConfig.auditFlows.join(", ")}]:
   a. ux_audit_flow(flow) to ground our current state.
   b. competitor_ux_scrape("rentredi", flow).
   c. competitor_ux_scrape("buildium", flow).
   d. Compare on CLARITY (steps, fields, jargon) and FLEXIBILITY (overrides, undo,
      AI controls) — not feature parity.
3. Identify the top ${cpoConfig.maxProposalsPerRun} flows where a competitor is
   meaningfully clearer or more flexible.
4. File a product_propose for each. Severity: high if we're materially worse on a
   top-traffic flow (signup, add_property, fmv_calculation, rent_renewal); medium
   otherwise.
5. Skip any change that would push us toward Buildium's density — our ICP can't
   handle 12-field forms.
6. Summary: where we lead, where we trail, ${cpoConfig.maxProposalsPerRun} proposals
   filed in priority order.`,
  toolNames: [
    "cpo_context_read",
    "ux_audit_flow",
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
