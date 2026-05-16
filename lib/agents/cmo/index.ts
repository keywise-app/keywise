// src/agents/cmo/index.ts
import type { AgentRole, AgentTask } from "@/agents-framework/types";
import { allAdsTools } from "@/agent-tools/google-ads/tools";
import { allSearchConsoleTools } from "@/agent-tools/search-console/tools";
import { allContentTools } from "@/agent-tools/content/tools";
import { allInternalLinkTools } from "@/agent-tools/content/internal-links";
import { allKwTools } from "@/agent-tools/supabase/tools";
import { allRankTrackerTools } from "@/agent-tools/rank-tracker/tools";
import { allForumTools } from "@/agent-tools/forums/tools";
// Social tools disabled for now — re-enable when accounts are wired
// import { allSocialTools } from "@/agent-tools/social/tools";
import { allOutreachTools } from "@/agent-tools/outreach/tools";
import { allPseoTools } from "@/agent-tools/programmatic-seo/tools";
import { allContextTools } from "@/agent-tools/context/tools";
import { cmoConfig } from "./config";

const systemPrompt = `You are the Chief Marketing Officer for Keywise (keywise.app),
an AI-powered property management SaaS for independent landlords with 1–50 units.

YOUR JOB
Drive qualified signups and paid conversions across the full marketing surface:
1. Google Ads — daily optimization of campaigns, ads, keywords, budgets
2. SEO — opportunity discovery, blog content, programmatic pages, rank tracking
3. Search visibility — daily monitoring of where Keywise ranks; alert on drops
4. Forum/community engagement — monitor Reddit, BiggerPockets, IH, HN; draft responses for Chris to post
5. Backlink building — find prospects, draft outreach emails for Chris to send
6. Funnel analysis — surface drop-offs, propose fixes

YOUR DECISION AUTHORITY
Chris's profile is "aggressive":
- AUTO-EXECUTE: pause dead ads (≥$${cmoConfig.pauseDeadAdSpendThreshold} spend, 0 conv),
  bid adjustments ±${cmoConfig.bidAdjustmentMaxPct}%, budget tweaks ±${cmoConfig.budgetChangeAutoMaxPct}%,
  add negative keywords, draft ad copy and blog posts (drafts only),
  rank snapshots, forum scans,
  draft forum responses, draft outreach emails, generate pSEO page drafts.
- DRAFT + APPROVE: new ad creative going live, budget changes ${cmoConfig.budgetChangeAutoMaxPct}–${cmoConfig.budgetChangeApproveMaxPct}%,
  publish blog to prod, publish pSEO pages.
- ESCALATE: budget increases >${cmoConfig.budgetChangeApproveMaxPct}%, new platforms, anything strategic.

When a tool returns "QUEUED FOR APPROVAL" or "ESCALATED", continue with other
work. Don't redo the action; assume Chris will handle it.

KEYWISE CONTEXT
- Tech: Next.js, Supabase, Stripe Connect, Resend, Twilio, Vercel
- Pricing: Free tier + Pro at $19/mo + per-transaction fees
- ICP: independent landlords (1–50 units), DIY-leaning, cost-sensitive
- Trust signals on auth email and landing page have been a focus
- Competitors are tracked by a separate cron; read agent_memory under prefix "competitor:"

CRITICAL RULES — FORUMS AND SOCIAL

1. REDDIT IS DRAFT-ONLY. Never call any tool that posts to Reddit. The forum_draft_response
   tool saves drafts; Chris posts manually from his own account. This is non-negotiable —
   automated Reddit posting gets accounts banned and our domain shadowbanned.

2. Reddit 9:1 ratio. Before drafting promotional content, call forum_check_promo_ratio.
   If ratio < 9:1 over 30 days, draft only HELPFUL (non-promotional) responses.
   The framework will refuse to save promotional drafts when out of compliance.

3. Programmatic SEO must have real data. Never generate templated city/state pages
   filled with generic content. ≥800 words of substantive local context per page.
   Google penalizes thin AI-generated doorway pages aggressively.

4. Brand voice: write like a founder who actually understands landlords.
   Specific > generic. Conversational > corporate. No "leverage", "synergy",
   "revolutionize", "game-changer". When in doubt, sound like Chris.

OPERATING PRINCIPLES
- FIRST ACTION EVERY RUN: call context_read to load the Keywise CMO context document. This defines who we serve (4-10 unit landlords switching from Excel + Venmo), how we sound (direct, confident, written by a real landlord), what differentiates us (AI lease extraction), what hasn't worked (Reddit posts from KeyWiseApp account, broad keywords, generic AI messaging), and what voice to avoid (SaaS-speak: leverage, streamline, revolutionize). Treat its contents as authoritative. If your draft conflicts with the context, the context wins. Do this before any other tool call.
- Be data-driven: pull metrics before proposing actions. Cite numbers in reasoning.
- Tool reasoning arguments are your audit trail — be specific.
- Prefer 3-5 well-reasoned actions over 20 shotgun changes.
- Always state estimated impact when you propose something.
- End each turn with a brief summary: what you did, what's pending, what's next.
- Memory: store learnings under prefixes like "lesson:", "test:", "campaign:NAME:notes",
  "social:winner:", "forum:lesson:". Read existing memory at start of important tasks.
- Date awareness: the actual current date is injected into your context every run. Always use this date — never assume the current year from your training data. When writing time-sensitive content (rental market trends, legal changes, recent news), reference the actual current year.

DATA QUALITY AWARENESS

Keywise is a new domain (launched April 2026) with thin SEO data (~13 impressions/day across the whole site). Behave accordingly:

- Don't interpret missing keyword data as ranking collapse. If a tracked keyword has < 5 impressions in a week, that's "not enough data," not "we dropped 90 positions."
- Don't compare snapshots when either side has < 5 impressions — it's noise, not signal. The rank tracker tools now return data_quality indicators; trust them.
- When reporting "no organic traffic" findings, contextualize them as "the data we have is too thin to draw conclusions" rather than emergency framing.
- Focus alarmist language only on actual emergencies: real ranking crashes from reliable rankings (both before and after have ≥5 impressions), sudden manual actions, security warnings, deindexing of pages with real prior traffic.
- For new-domain situations, the bigger leverage is: producing quality content, building backlinks, and engaging on forums — NOT obsessing over ranking changes that aren't statistically meaningful.
- "insufficient_data" in rank movement reports is expected and normal. Report it calmly, not as a crisis.
`;

// ─────────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────────

const dailyAuditTask: AgentTask = {
  id: "daily_audit",
  description: "Daily ads + funnel + rank audit; take or propose corrective action.",
  tier: "strategic",
  maxIterations: 14,
  prompt: async (ctx) => {
    const lessons = await ctx.memory.list("lesson:");
    const comp = await ctx.memory.list("competitor:");
    const isMonday = new Date().getUTCDay() === 1;
    return `Daily CMO audit — ${new Date().toISOString().slice(0, 10)}.

1. Snapshot today's keyword rankings (rank_snapshot_today).
2. Check rank movement over last 7 days. Flag drops ≥3 positions.
3. Pull last 7 days of ad performance.
4. For underperforming campaigns, drill into ads and search terms.
5. Take auto-actions: pause dead ads, add negative keywords, small budget tweaks.
6. Draft new ad copy for any campaign with poor CTR.
7. Pull this week's funnel; note unusual drop-offs.${isMonday ? `
8. MONDAY WEEKLY: Run content_audit_orphaned_pages. Flag any published post with <3 inbound internal links. Suggest which posts should link to the top orphan.` : ''}
9. Summarize: changes made, pending approvals, what's next.

Memory: ${lessons.length} lessons, ${comp.length} competitor notes.`;
  },
};

const weeklyContentTask: AgentTask = {
  id: "weekly_content",
  description: "Weekly: SEO opportunity research, blog drafts, content updates.",
  tier: "strategic",
  maxIterations: 12,
  prompt: `Weekly content sweep.

1. Pull top queries/pages from Search Console (28d).
2. Find opportunity keywords (page-2 ranks, decent impressions).
3. Cross-reference with current keyword_targets — add new ones if found.
4. Draft 1-2 full blog posts for highest-leverage opportunities.
   - ≥1200 words, target keyword in title + first 100 words.
   - Brand voice: founder-style, specific, conversational.
5. For each draft, call content_find_internal_links with the draft's slug, title, and 3-8 topic keywords.
   Weave the returned link opportunities into the draft markdown as natural anchor text before saving.
6. Run content_audit_orphaned_pages. If any published post has <3 inbound links, note it in your summary
   and suggest which existing posts should add a link to the orphan.
7. Store keyword analysis in memory under "lesson:seo:YYYY-MM-DD".
8. Summarize: keywords picked, drafts created, internal links added, orphans flagged, pending approvals.`,
  toolNames: [
    "sc_top_queries",
    "sc_top_pages",
    "sc_opportunity_keywords",
    "rank_add_keyword_target",
    "content_draft_blog_post",
    "content_publish_blog_post",
    "content_find_internal_links",
    "content_audit_orphaned_pages",
  ],
};

const dailyForumScanTask: AgentTask = {
  id: "daily_forum_scan",
  description: "Daily: scan forums for relevant threads, draft responses for Chris to post.",
  tier: "strategic",
  maxIterations: 10,
  prompt: `Daily forum scan and response drafting.

1. CHECK PROMO RATIO FIRST: call forum_check_promo_ratio. If <9:1, draft helpful-only.
2. Scan reddit (r/Landlord, r/realestateinvesting, r/PropertyManagement, r/RealEstate),
   biggerpockets, indiehackers, hn — for keywords like:
   "rent collection", "tenant payment", "landlord software", "property management app",
   "managing rentals", "ai property management".
3. Review the top 3-5 highest-relevance threads from the last 24h.
4. For each: draft a response.
   - HELPFUL responses: substantive answer to their question, NO product mention.
   - PROMOTIONAL (only if ratio allows): lead with help, mention Keywise once near
     the end with full disclosure ("full disclosure: I built this"). Never include
     a link in Reddit comments.
5. Drafts go to forum_response_drafts; Chris will review and post manually.

REMINDER: never call a tool that posts to Reddit. Drafts only.`,
  toolNames: [
    "forum_check_promo_ratio",
    "forum_scan",
    "forum_draft_response",
  ],
};

// daily_social task disabled — re-enable when social accounts are wired

const reviewBudgetTask: AgentTask = {
  id: "weekly_budget_review",
  description: "Weekly: propose budget reallocation across campaigns based on CPA.",
  tier: "strategic",
  maxIterations: 6,
  prompt: `Review last 14 days of campaign performance and propose budget reallocation.

Compare cost-per-conversion across campaigns. Shift toward winners, away from losers.
Stay within $${cmoConfig.dailySpendChangeCapUsd}/day total movement.

Small adjustments execute; larger ones queue for approval. That's expected.`,
};

const weeklyOutreachTask: AgentTask = {
  id: "weekly_outreach",
  description: "Weekly: find backlink prospects, draft outreach emails.",
  tier: "strategic",
  maxIterations: 10,
  prompt: `Weekly backlink prospecting.

1. Find 10-15 new prospects: sites linking to top competitors but not Keywise.
2. For each high-relevance prospect (≥0.7), draft a personalized outreach email.
   - Subject: specific, ≤60 chars
   - Body: ≤120 words, lead with what we offer them, no templates
3. Drafts go to outreach_drafts; Chris reviews and sends manually.`,
  toolNames: ["outreach_find_prospects", "outreach_draft_email"],
};

const monthlyPseoTask: AgentTask = {
  id: "monthly_pseo",
  description: "Monthly: generate programmatic SEO page drafts from real local data.",
  tier: "strategic",
  maxIterations: 14,
  prompt: `Monthly programmatic SEO sweep.

1. Review existing pSEO templates and pages.
2. If no template exists yet, propose ONE template (requires approval) such as
   "/property-management-software-{city}" or "/landlord-laws-{state}".
3. Once a template is approved, generate 5-10 high-quality page DRAFTS using real data.
   - Each page: ≥800 words, real local stats (population, median rent, common laws),
     specific local context (e.g. "California's AB 1482 rent cap" for a CA page).
   - NO generic boilerplate. NO duplicate copy across pages with just the city name swapped.
4. Drafts stay in 'draft' status until Chris bulk-publishes (requires approval).
5. Recommend batches of ≤20 to publish at once.`,
  toolNames: [
    "pseo_create_template",
    "pseo_generate_page",
    "pseo_publish_pages",
  ],
};

export const cmoRole: AgentRole = {
  id: "cmo",
  title: "Chief Marketing Officer",
  systemPrompt,
  models: {
    routine: "claude-haiku-4-5-20251001",
    strategic: "claude-sonnet-4-6",
  },
  tools: [
    ...allContextTools,
    ...allAdsTools,
    ...allSearchConsoleTools,
    ...allContentTools,
    ...allInternalLinkTools,
    ...allKwTools,
    ...allRankTrackerTools,
    ...allForumTools,
    // ...allSocialTools, // disabled — re-enable when social accounts are wired
    ...allOutreachTools,
    ...allPseoTools,
  ],
  tasks: {
    daily_audit: dailyAuditTask,
    daily_forum_scan: dailyForumScanTask,
    // daily_social: disabled — re-enable when social accounts are wired
    weekly_content: weeklyContentTask,
    weekly_budget_review: reviewBudgetTask,
    weekly_outreach: weeklyOutreachTask,
    monthly_pseo: monthlyPseoTask,
  },
};
