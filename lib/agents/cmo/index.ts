// src/agents/cmo/index.ts
import type { AgentRole, AgentTask } from "@/agents-framework/types";
import { allSearchConsoleTools } from "@/agent-tools/search-console/tools";
import { fetchTopQueries, fetchTopPages, fetchOpportunityKeywords } from "@/agent-tools/search-console/client";
import { allContentTools } from "@/agent-tools/content/tools";
import { allInternalLinkTools } from "@/agent-tools/content/internal-links";
import { allSerpAnalysisTools } from "@/agent-tools/content/serp-analysis";
import { allKwTools } from "@/agent-tools/supabase/tools";
import { allRankTrackerTools } from "@/agent-tools/rank-tracker/tools";
import { allPseoTools } from "@/agent-tools/programmatic-seo/tools";
import { allContextTools } from "@/agent-tools/context/tools";

// Removed 2026-08-22: google-ads tools were 100% mocked (every mutating call
// returned {ok:true, mock:true}, never touched a real account); forums/social/
// outreach tools returned hardcoded fake data (the forum scanner returned the
// same one canned post every run). Reviving these needs real integrations
// built from scratch, not a config flip — cut rather than pretend they work.
// See lib/agent-tools/{google-ads,forums,social,outreach}/ removal in the
// same commit for what was deleted.

const systemPrompt = `You are the Chief Marketing Officer for Keywise (keywise.app),
a California landlord compliance SaaS.

YOUR JOB
Grow qualified organic traffic and conversions through content and search, with
you as the approval gate on anything that publishes:
1. SEO — opportunity discovery, blog content, programmatic pages, rank tracking
2. Search visibility — monitor where Keywise ranks; note real drops, ignore noise
3. Content refresh — keep published posts current and competitive
4. Tool proposals — suggest free calculators/tools worth building for SEO

YOUR DECISION AUTHORITY
- AUTO-EXECUTE: rank snapshots, keyword research, SERP analysis, drafting
  blog posts and pSEO pages (drafts only — never touches published content).
- DRAFT + APPROVE: publishing anything (blog_drafts, pSEO pages) always
  requires Chris to approve at /admin/agents/blog-drafts. No exceptions —
  there is no auto-publish path for this agent.
- ESCALATE: anything outside the above.

When a tool returns "QUEUED FOR APPROVAL" or "ESCALATED", continue with other
work. Don't redo the action; assume Chris will handle it.

KEYWISE CONTEXT
- Tech: Next.js, Supabase, Stripe Connect, Resend, Twilio, Vercel
- Pricing: Free for 1-2 units; Pro $49/mo ($29/mo founding, $390/yr annual)
- ICP: California landlords who need to get AB 1482 / just-cause eviction /
  security deposit compliance right — the wedge is compliance, not generic
  property management features
- Competitors are tracked by a separate on-demand process; read agent_memory
  under prefix "competitor:"

OPERATING PRINCIPLES (CONTENT)

1. Programmatic SEO must have real data. Never generate templated city/state pages
   filled with generic content. ≥800 words of substantive local context per page.
   Google penalizes thin AI-generated doorway pages aggressively.

2. Brand voice: write like a founder who actually understands California landlord
   compliance. Specific > generic. Conversational > corporate. No "leverage",
   "synergy", "revolutionize", "game-changer". Cite the actual statute (AB 1482,
   CC 1946.2, etc.) rather than vague "the law says" — landlords searching for
   this content want the specific citation.

OPERATING PRINCIPLES
- FIRST ACTION EVERY RUN: call context_read to load the Keywise CMO context document. This defines who we serve (4-10 unit landlords switching from Excel + Venmo), how we sound (direct, confident, written by a real landlord), what differentiates us (AI lease extraction), what hasn't worked (Reddit posts from KeyWiseApp account, broad keywords, generic AI messaging), and what voice to avoid (SaaS-speak: leverage, streamline, revolutionize). Treat its contents as authoritative. If your draft conflicts with the context, the context wins. Do this before any other tool call.
- Be data-driven: pull metrics before proposing actions. Cite numbers in reasoning.
- Tool reasoning arguments are your audit trail — be specific.
- Prefer 3-5 well-reasoned actions over 20 shotgun changes.
- Always state estimated impact when you propose something.
- End each turn with a brief summary: what you did, what's pending, what's next.
- Memory: store learnings under prefixes like "lesson:", "campaign:NAME:notes".
  Read existing memory at start of important tasks.
- Date awareness: the actual current date is injected into your context every run. Always use this date — never assume the current year from your training data. When writing time-sensitive content (rental market trends, legal changes, recent news), reference the actual current year.

DATA QUALITY AWARENESS

Keywise is a small, recently-repositioned domain with thin SEO data. Behave accordingly:

- Don't interpret missing keyword data as ranking collapse. If a tracked keyword has < 5 impressions in a week, that's "not enough data," not "we dropped 90 positions."
- Don't compare snapshots when either side has < 5 impressions — it's noise, not signal. The rank tracker tools return data_quality indicators; trust them.
- When reporting "no organic traffic" findings, contextualize them as "the data we have is too thin to draw conclusions" rather than emergency framing.
- Focus alarmist language only on actual emergencies: real ranking crashes from reliable rankings (both before and after have ≥5 impressions), sudden manual actions, security warnings, deindexing of pages with real prior traffic.
- For a domain this new, the bigger leverage is producing quality, statute-specific content — NOT obsessing over ranking changes that aren't statistically meaningful.
- "insufficient_data" in rank movement reports is expected and normal. Report it calmly, not as a crisis.
`;

// ─────────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────────

const dailyRankCheckTask: AgentTask = {
  id: "daily_rank_check",
  description: "Daily: snapshot keyword rankings, flag real movement, weekly orphan-link audit on Mondays.",
  tier: "strategic",
  maxIterations: 8,
  prompt: async (ctx) => {
    const lessons = await ctx.memory.list("lesson:");
    const comp = await ctx.memory.list("competitor:");
    const isMonday = new Date().getUTCDay() === 1;
    return `Daily rank check — ${new Date().toISOString().slice(0, 10)}.

1. Snapshot today's keyword rankings (rank_snapshot_today).
2. Check rank movement over last 7 days (rank_movement_report). Flag drops ≥3 positions
   — but only where both the before and after snapshot have ≥5 impressions; anything
   thinner than that is noise, not signal, per the data quality rules above.${isMonday ? `
3. MONDAY WEEKLY: Run content_audit_orphaned_pages. Flag any published post with <3 inbound internal links. Suggest which posts should link to the top orphan.` : ''}
4. Summarize: real movement (if any), what's next.

Memory: ${lessons.length} lessons, ${comp.length} competitor notes.`;
  },
  toolNames: [
    "rank_snapshot_today",
    "rank_movement_report",
    "content_audit_orphaned_pages",
  ],
};

const weeklyContentTask: AgentTask = {
  id: "weekly_content",
  description: "Weekly: SEO opportunity research, blog drafts, content updates.",
  tier: "strategic",
  maxIterations: 8,
  // Pre-fetch Search Console data server-side (same pattern as daily_rank_check's
  // context_read) instead of having the agent call 3 SC tools itself — each tool
  // call is a full LLM round trip, and this whole task must fit inside one 300s
  // serverless invocation (Vercel Hobby plan hard cap).
  prompt: async () => {
    let scSection: string;
    try {
      const [topQueries, topPages, opportunities] = await Promise.all([
        fetchTopQueries(28),
        fetchTopPages(28),
        fetchOpportunityKeywords(),
      ]);
      scSection = `TOP QUERIES (28d): ${JSON.stringify(topQueries.slice(0, 15))}
TOP PAGES (28d): ${JSON.stringify(topPages.slice(0, 15))}
OPPORTUNITY KEYWORDS (page-2 ranks, decent impressions): ${JSON.stringify(opportunities.slice(0, 15))}`;
    } catch (err: any) {
      // Do NOT fall back to empty arrays here -- that reads as "zero search
      // visibility," which is a much stronger (and false) claim than "the
      // API call failed." Say so plainly instead.
      scSection = `SEARCH CONSOLE DATA UNAVAILABLE (${err?.message ?? String(err)}). Do not treat this as zero search visibility -- the Search Console connection itself failed. Pick this week's keyword from general landlord-compliance judgment and existing keyword_targets instead of live query/page data.`;
    }
    return `Weekly content sweep.

${scSection}

1. Pick the single best opportunity keyword from the data above (page-2 rank, decent
   impressions, clear landlord-compliance relevance). Cross-reference with current
   keyword_targets via rank_add_keyword_target if it's not tracked yet.
2. For that keyword, call content_analyze_serp FIRST.
   This gives you: our current ranking, related queries, existing posts that might overlap,
   and a gap brief with must-cover topics, target word count (capped ~1800 words to fit
   this task's execution budget), differentiators to include, and cannibalization warnings.
3. Draft exactly 1 full blog post following the gap brief:
   - Hit the targetWordCount from the brief
   - Cover every item in must_cover
   - Include every differentiator that fits naturally
   - If cannibalization_risk is flagged, consider content_update_blog_post instead
   - Brand voice: founder-style, specific, conversational
4. Call content_find_internal_links and weave links into the draft's markdown.
5. Store keyword analysis in memory under "lesson:seo:YYYY-MM-DD".
6. Summarize: keyword picked, draft created, gap brief compliance.

NOTE: orphaned-page auditing already runs every Monday inside daily_rank_check — don't
duplicate it here.`;
  },
  toolNames: [
    "rank_add_keyword_target",
    "content_analyze_serp",
    "content_draft_blog_post",
    "content_update_blog_post",
    "content_publish_blog_post",
    "content_find_internal_links",
  ],
};

// Removed 2026-08-22 (fake-tool tasks — see removal note above the imports):
//   daily_forum_scan, weekly_budget_review, weekly_outreach,
//   weekly_linkable_asset_audit

const monthlyPseoTask: AgentTask = {
  id: "monthly_pseo",
  description: "Monthly: generate a small batch of programmatic SEO page drafts from real local data.",
  tier: "strategic",
  maxIterations: 10,
  prompt: `Monthly programmatic SEO sweep.

1. Review existing pSEO templates and pages.
2. If no template exists yet, propose ONE template (requires approval) such as
   "/property-management-software-{city}" or "/landlord-laws-{state}".
3. Once a template is approved, generate exactly 3 high-quality page DRAFTS using real
   data (not 5-10 — this task must fit inside one 300s serverless invocation; run again
   next month to build out more of the template).
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

const weeklyContentRefreshTask: AgentTask = {
  id: "weekly_content_refresh",
  description: "Weekly (Thu): audit published posts older than 90 days, refresh the single best underperformer.",
  tier: "strategic",
  maxIterations: 8,
  // Same fix as weekly_content: pre-fetch SC data server-side instead of 2 more
  // agent-driven round trips, and cut scope to 1 refresh (this must fit inside
  // one 300s serverless invocation — Vercel Hobby plan hard cap).
  prompt: async () => {
    let scSection: string;
    let hasScData = true;
    try {
      const [topQueries, topPages] = await Promise.all([
        fetchTopQueries(28),
        fetchTopPages(28),
      ]);
      scSection = `TOP QUERIES (28d): ${JSON.stringify(topQueries.slice(0, 15))}
TOP PAGES (28d): ${JSON.stringify(topPages.slice(0, 15))}`;
    } catch (err: any) {
      hasScData = false;
      scSection = `SEARCH CONSOLE DATA UNAVAILABLE (${err?.message ?? String(err)}). Do not treat this as zero search visibility -- the Search Console connection itself failed.`;
    }
    return `Weekly content refresh — ${new Date().toISOString().slice(0, 10)}.

GOAL: Find published blog posts that are stale or underperforming and refresh the single
best one. Refreshed posts often jump 5-20 positions — often more than new posts ever achieve.

${scSection}

1. Call content_list_published to get all published posts with their dates.
2. Identify posts older than 90 days (published_at before ${new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)}).
3. ${hasScData ? `Cross-reference against the Search Console data above:
   - Is the target keyword ranking on page 2-3 (positions 11-30)? → high-value refresh
   - Is it getting impressions but low CTR? → title/meta refresh` : "Search Console data is unavailable this run -- pick the refresh candidate by age and topic relevance instead of ranking/CTR data."}
4. Pick the SINGLE highest-leverage refresh candidate (not 1-2 — one done well beats
   two rushed, and this task runs on a tight execution budget).
5. Call content_find_internal_links to find new linking opportunities from recently
   published posts that didn't exist when the original was written.
6. Call content_update_blog_post with refreshed content:
   - Update all year references to current year (${new Date().getFullYear()})
   - Add fresh statistics, data points, or examples
   - Expand thin sections (any H2 with <150 words)
   - Weave in new internal links to recent posts
   - Update meta_description if CTR is below 3%
   - Keep the same slug and URL — we're refreshing, not replacing
7. The update will queue for approval since the post is published (live content).
8. Summarize: which post was refreshed, what changed, expected impact.

NOTE: Static blog posts (hardcoded in app/blog/) cannot be refreshed by this tool —
only posts in the blog_drafts table. Focus on those.`;
  },
  toolNames: [
    "content_list_published",
    "content_analyze_serp",
    "content_find_internal_links",
    "content_update_blog_post",
  ],
};

const monthlyToolProposalTask: AgentTask = {
  id: "monthly_tool_proposal",
  description: "Monthly: propose 1 free tool/calculator for keywise.app/tools/ that would rank for a high-value keyword.",
  tier: "strategic",
  maxIterations: 10,
  prompt: async (ctx) => {
    const existing = await ctx.memory.list("tool_proposal:");
    return `Monthly tool proposal — ${new Date().toISOString().slice(0, 10)}.

GOAL: Propose ONE free tool or calculator that lives at keywise.app/tools/<slug> as a public page.
These are product features — interactive tools that solve a specific landlord problem and rank for
a high-value keyword. They get built by the dev team; your job is to identify which one to build next.

EXAMPLES OF GOOD TOOL PROPOSALS:
- Fair Market Rent Calculator by ZIP (target: "fair market rent calculator")
- California Security Deposit Calculator (target: "california security deposit calculator")
- Late Fee Calculator by State (target: "late fee calculator landlord")
- 1099 Income Tracker for Landlords (target: "1099 rental income tracker")
- Lease Renewal Decision Tool (target: "should I renew my tenant's lease")
- Rent vs Buy Calculator for Investors (target: "rent vs buy calculator investment")

PROCESS:
1. Pull Search Console opportunity keywords to see what landlords are already searching for.
2. Review existing tool proposals in memory (${existing.length} already proposed) — don't duplicate.
3. Identify 3-5 keyword candidates that have:
   - Commercial or transactional intent (the searcher wants a tool, not just info)
   - No dominant free tool from a competitor in the top 3 results
   - Natural backlink potential (other blogs would link to a useful free calculator)
4. Pick the SINGLE highest-leverage one and call content_propose_tool_page with a full spec.
5. Explain your reasoning: why this keyword, why this tool format, why now.

WHAT MAKES A GREAT PROPOSAL:
- Solves a real ICP pain point (4-10 unit landlords)
- Keyword has search volume and the SERP isn't dominated by free tools yet
- Output is actionable (calculator result, recommendation, checklist)
- Can naturally link to Keywise features ("want to automate this? Try Keywise")
- Other landlord blogs and resource pages would link to it

WHAT TO AVOID:
- Tools that require real-time API data we don't have (MLS feeds, tax databases)
- Tools that duplicate what our existing product does (rent collection is already in the app)
- Generic tools with no landlord specificity ("basic mortgage calculator")

Existing proposals in memory: ${existing.map(e => e.key).join(", ") || "none yet"}.`;
  },
  toolNames: [
    "sc_top_queries",
    "sc_opportunity_keywords",
    "content_propose_tool_page",
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
    ...allSearchConsoleTools,
    ...allContentTools,
    ...allSerpAnalysisTools,
    ...allInternalLinkTools,
    ...allKwTools,
    ...allRankTrackerTools,
    ...allPseoTools,
  ],
  tasks: {
    daily_rank_check: dailyRankCheckTask,
    weekly_content: weeklyContentTask,
    weekly_content_refresh: weeklyContentRefreshTask,
    monthly_pseo: monthlyPseoTask,
    monthly_tool_proposal: monthlyToolProposalTask,
  },
};
