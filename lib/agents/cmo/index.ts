// src/agents/cmo/index.ts
import type { AgentRole, AgentTask } from "@/agents-framework/types";
import { allAdsTools } from "@/agent-tools/google-ads/tools";
import { allSearchConsoleTools } from "@/agent-tools/search-console/tools";
import { allContentTools } from "@/agent-tools/content/tools";
import { allKwTools } from "@/agent-tools/supabase/tools";
import { allRankTrackerTools } from "@/agent-tools/rank-tracker/tools";
import { allForumTools } from "@/agent-tools/forums/tools";
import { allSocialTools } from "@/agent-tools/social/tools";
import { allOutreachTools } from "@/agent-tools/outreach/tools";
import { allPseoTools } from "@/agent-tools/programmatic-seo/tools";
import { cmoConfig } from "./config";

const systemPrompt = `You are the Chief Marketing Officer for Keywise (keywise.app),
an AI-powered property management SaaS for independent landlords with 1–50 units.

YOUR JOB
Drive qualified signups and paid conversions across the full marketing surface:
1. Google Ads — daily optimization of campaigns, ads, keywords, budgets
2. SEO — opportunity discovery, blog content, programmatic pages, rank tracking
3. Search visibility — daily monitoring of where Keywise ranks; alert on drops
4. Forum/community engagement — monitor Reddit, BiggerPockets, IH, HN; draft responses for Chris to post
5. Social media — auto-post on owned channels (Twitter/X, Bluesky); draft for LinkedIn
6. Backlink building — find prospects, draft outreach emails for Chris to send
7. Funnel analysis — surface drop-offs, propose fixes

YOUR DECISION AUTHORITY
Chris's profile is "aggressive":
- AUTO-EXECUTE: pause dead ads (≥$${cmoConfig.pauseDeadAdSpendThreshold} spend, 0 conv),
  bid adjustments ±${cmoConfig.bidAdjustmentMaxPct}%, budget tweaks ±${cmoConfig.budgetChangeAutoMaxPct}%,
  add negative keywords, draft ad copy and blog posts (drafts only),
  rank snapshots, forum scans, social drafts, post to Twitter/X and Bluesky,
  draft forum responses, draft outreach emails, generate pSEO page drafts.
- DRAFT + APPROVE: new ad creative going live, budget changes ${cmoConfig.budgetChangeAutoMaxPct}–${cmoConfig.budgetChangeApproveMaxPct}%,
  publish blog to prod, publish pSEO pages, post on LinkedIn.
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

3. Twitter/X cost discipline. Posts with URLs cost $0.20 each (vs $0.015 plain text).
   Post URLs only for genuinely shareable content (new blog posts, big launches).
   Daily tips and threads should be plain text.

4. Bluesky has 300-grapheme limit. Twitter 280. LinkedIn 3000. Threads ~500. Check before drafting.

5. Programmatic SEO must have real data. Never generate templated city/state pages
   filled with generic content. ≥800 words of substantive local context per page.
   Google penalizes thin AI-generated doorway pages aggressively.

6. Brand voice: write like a founder who actually understands landlords.
   Specific > generic. Conversational > corporate. No "leverage", "synergy",
   "revolutionize", "game-changer". When in doubt, sound like Chris.

OPERATING PRINCIPLES
- Be data-driven: pull metrics before proposing actions. Cite numbers in reasoning.
- Tool reasoning arguments are your audit trail — be specific.
- Prefer 3-5 well-reasoned actions over 20 shotgun changes.
- Always state estimated impact when you propose something.
- End each turn with a brief summary: what you did, what's pending, what's next.
- Memory: store learnings under prefixes like "lesson:", "test:", "campaign:NAME:notes",
  "social:winner:", "forum:lesson:". Read existing memory at start of important tasks.
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
    return `Daily CMO audit — ${new Date().toISOString().slice(0, 10)}.

1. Snapshot today's keyword rankings (rank_snapshot_today).
2. Check rank movement over last 7 days. Flag drops ≥3 positions.
3. Pull last 7 days of ad performance.
4. For underperforming campaigns, drill into ads and search terms.
5. Take auto-actions: pause dead ads, add negative keywords, small budget tweaks.
6. Draft new ad copy for any campaign with poor CTR.
7. Pull this week's funnel; note unusual drop-offs.
8. Summarize: changes made, pending approvals, what's next.

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
   - ≥1200 words, target keyword in title + first 100 words, internal links to /pricing.
   - Brand voice: founder-style, specific, conversational.
5. Store keyword analysis in memory under "lesson:seo:YYYY-MM-DD".
6. Summarize: keywords picked, drafts created, pending publish approvals.`,
  toolNames: [
    "sc_top_queries",
    "sc_top_pages",
    "sc_opportunity_keywords",
    "rank_add_keyword_target",
    "content_draft_blog_post",
    "content_publish_blog_post",
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

const dailySocialTask: AgentTask = {
  id: "daily_social",
  description: "Daily: post on Twitter/X and Bluesky; draft for LinkedIn.",
  tier: "strategic",
  maxIterations: 8,
  prompt: async (ctx) => {
    const recentWinners = await ctx.memory.list("social:winner:");
    return `Daily social pulse.

1. Review recent posts (social_recent_performance, 14d) — what's been posted?
2. Avoid repeating recent topics; aim for 1 post today.
3. Draft a single post that fits the Keywise voice:
   - "tip" (no link — $0.015 on X): a specific landlord insight (legal, financial, ops)
   - "blog_announce" (URL — $0.20 on X): only if there's a fresh blog post worth pushing
   - "milestone" (no link): a real number we hit (signups, units managed, $ collected)
4. Cross-post to Twitter/X and Bluesky. Adapt for length per platform.
5. Optionally draft a longer LinkedIn version (gets queued for your manual posting).
6. Store the topic + angle in memory under "social:winner:YYYY-MM-DD" if it performs later.

Recent winners in memory: ${recentWinners.length} entries.`;
  },
  toolNames: [
    "social_recent_performance",
    "social_draft_post",
    "social_publish_post",
  ],
};

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
    ...allAdsTools,
    ...allSearchConsoleTools,
    ...allContentTools,
    ...allKwTools,
    ...allRankTrackerTools,
    ...allForumTools,
    ...allSocialTools,
    ...allOutreachTools,
    ...allPseoTools,
  ],
  tasks: {
    daily_audit: dailyAuditTask,
    daily_forum_scan: dailyForumScanTask,
    daily_social: dailySocialTask,
    weekly_content: weeklyContentTask,
    weekly_budget_review: reviewBudgetTask,
    weekly_outreach: weeklyOutreachTask,
    monthly_pseo: monthlyPseoTask,
  },
};
