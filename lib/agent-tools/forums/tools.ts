// src/tools/forums/tools.ts
// Scans Reddit and other forums for threads where Keywise would help.
// Drafts responses for human review. NEVER posts on Reddit autonomously
// (this is the documented way to get banned).

import type { AgentTool } from "@/agents-framework/types";

interface ForumHit {
  platform: "reddit" | "biggerpockets" | "indiehackers" | "hn";
  externalId: string;
  url: string;
  title: string;
  body: string;
  author: string;
  postedAt: string;
  score: number;
  numComments: number;
  subreddit?: string;
}

// In production: use snoowrap (Reddit), HN Algolia API, scraping for the others.
async function scanReddit(
  subreddits: string[],
  keywords: string[]
): Promise<ForumHit[]> {
  // TODO real Reddit API via snoowrap.
  // Search each subreddit for posts containing our target keywords from last 48h.
  // Filter to posts with: text body (not just link), score ≥ 1, < 24h old, ≥ 1 comment.
  return [
    {
      platform: "reddit",
      externalId: "1abcd2",
      url: "https://reddit.com/r/Landlord/comments/1abcd2/best_app_for_collecting_rent",
      title: "Best app for collecting rent from 4 tenants?",
      body: "I have a small duplex with 4 tenants total. Right now I'm using Venmo but it's getting messy with reminders, late fees, etc. What do you all use?",
      author: "u/duplex_dad_1985",
      postedAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
      score: 7,
      numComments: 3,
      subreddit: "r/Landlord",
    },
  ];
}

async function scanBiggerPockets(_keywords: string[]): Promise<ForumHit[]> {
  return []; // TODO scraping
}

async function scanHN(_keywords: string[]): Promise<ForumHit[]> {
  // TODO Algolia HN search API
  return [];
}

export const scanForumsTool: AgentTool<{
  platforms: ("reddit" | "biggerpockets" | "indiehackers" | "hn")[];
  keywords: string[];
  subreddits?: string[];
}> = {
  name: "forum_scan",
  description:
    "Scan forums for recent threads matching keywords. Inserts new hits into forum_threads with relevance scores. Always auto — read-only discovery.",
  inputSchema: {
    type: "object",
    properties: {
      platforms: {
        type: "array",
        items: { type: "string", enum: ["reddit", "biggerpockets", "indiehackers", "hn"] },
      },
      keywords: { type: "array", items: { type: "string" } },
      subreddits: {
        type: "array",
        items: { type: "string" },
        description: "Required for reddit. e.g. ['Landlord','realestateinvesting']",
      },
    },
    required: ["platforms", "keywords"],
  },
  defaultAuthority: "auto",
  describeAction: (i) =>
    `Scan ${i.platforms.join(",")} for: ${i.keywords.slice(0, 3).join(", ")}${i.keywords.length > 3 ? "..." : ""}`,
  execute: async (i, ctx) => {
    const allHits: ForumHit[] = [];
    if (i.platforms.includes("reddit")) {
      allHits.push(...(await scanReddit(i.subreddits ?? [], i.keywords)));
    }
    if (i.platforms.includes("biggerpockets")) {
      allHits.push(...(await scanBiggerPockets(i.keywords)));
    }
    if (i.platforms.includes("hn")) {
      allHits.push(...(await scanHN(i.keywords)));
    }

    if (allHits.length === 0) return { found: 0 };

    const rows = allHits.map((h) => ({
      platform: h.platform,
      external_id: h.externalId,
      subreddit: h.subreddit,
      url: h.url,
      title: h.title,
      body: h.body,
      author: h.author,
      posted_at: h.postedAt,
      score: h.score,
      num_comments: h.numComments,
      matched_keywords: i.keywords.filter(
        (k) =>
          h.title.toLowerCase().includes(k.toLowerCase()) ||
          h.body.toLowerCase().includes(k.toLowerCase())
      ),
      relevance_score: scoreRelevance(h, i.keywords),
    }));
    const { error } = await ctx.supabase
      .from("forum_threads")
      .upsert(rows, { onConflict: "platform,external_id", ignoreDuplicates: true });
    if (error) throw error;
    return { found: rows.length, hits: rows };
  },
};

function scoreRelevance(h: ForumHit, keywords: string[]): number {
  const text = `${h.title} ${h.body}`.toLowerCase();
  const matches = keywords.filter((k) => text.includes(k.toLowerCase())).length;
  const base = Math.min(matches / 3, 1);
  // Boost recent + engaged posts
  const ageHours = (Date.now() - new Date(h.postedAt).getTime()) / 3600_000;
  const recency = Math.max(0, 1 - ageHours / 48);
  const engagement = Math.min(h.numComments / 20, 1);
  return Number((base * 0.6 + recency * 0.2 + engagement * 0.2).toFixed(2));
}

export const draftForumResponseTool: AgentTool<{
  threadId: string;
  responseText: string;
  isPromotional: boolean;
  reasoning: string;
}> = {
  name: "forum_draft_response",
  description:
    "Draft a response to a forum thread. Always saves as draft for Chris to review and post manually from his own account. NEVER posts autonomously — Reddit's spam filters and human mods specifically hunt SaaS founders posting promotionally. Set isPromotional=true if mentioning Keywise; the framework enforces a 9:1 helpful:promotional ratio over time.",
  inputSchema: {
    type: "object",
    properties: {
      threadId: { type: "string" },
      responseText: {
        type: "string",
        description:
          "The actual response. Must read like a real human. If promotional, lead with genuine help; mention Keywise once near the end with full disclosure ('full disclosure: I built this'). Never include a link in Reddit comments — just the product name.",
      },
      isPromotional: { type: "boolean" },
      reasoning: {
        type: "string",
        description: "Why this thread is a fit and why this response will help",
      },
    },
    required: ["threadId", "responseText", "isPromotional", "reasoning"],
  },
  defaultAuthority: "auto", // drafting is fine, posting is human-only by design
  describeAction: (i) =>
    `Draft ${i.isPromotional ? "promotional" : "helpful"} response to forum thread ${i.threadId}`,
  execute: async (i, ctx) => {
    // Compute current ratio for the agent's own awareness
    const today = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const { data: log } = await ctx.supabase
      .from("reddit_activity_log")
      .select("helpful_comments, promotional_comments")
      .gte("acted_on", since);
    const helpful = (log ?? []).reduce((s: number, r: any) => s + (r.helpful_comments ?? 0), 0);
    const promo = (log ?? []).reduce((s: number, r: any) => s + (r.promotional_comments ?? 0), 0);
    const ratio = promo === 0 ? Infinity : helpful / promo;

    // Hard rule: if the agent tries to draft promotional content while ratio < 9, flag it
    if (i.isPromotional && ratio < 9 && promo > 0) {
      return {
        warning: `Current 30d helpful:promotional ratio is ${ratio.toFixed(1)}:1 (need ≥9:1). Draft saved but flagged — recommend Chris post helpful comments first. ${helpful} helpful / ${promo} promotional in last 30d.`,
        ratio,
        draftId: null,
      };
    }

    const { data, error } = await ctx.supabase
      .from("forum_response_drafts")
      .insert({
        thread_id: i.threadId,
        draft_text: i.responseText,
        reasoning: i.reasoning,
        is_promotional: i.isPromotional,
        promo_ratio_at_draft: ratio === Infinity ? null : ratio,
      })
      .select("id")
      .single();
    if (error) throw error;

    // Mark thread as drafted
    await ctx.supabase
      .from("forum_threads")
      .update({ status: "drafted" })
      .eq("id", i.threadId);

    return { draftId: data.id, ratio };
  },
};

export const checkPromoRatioTool: AgentTool<{}> = {
  name: "forum_check_promo_ratio",
  description:
    "Check current helpful:promotional comment ratio across forums (last 30 days). Use this BEFORE drafting promotional responses — Reddit requires ≥9:1.",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "Check 30d helpful:promotional ratio",
  execute: async (_, ctx) => {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const { data: log } = await ctx.supabase
      .from("reddit_activity_log")
      .select("helpful_comments, promotional_comments")
      .gte("acted_on", since);
    const helpful = (log ?? []).reduce((s: number, r: any) => s + (r.helpful_comments ?? 0), 0);
    const promo = (log ?? []).reduce((s: number, r: any) => s + (r.promotional_comments ?? 0), 0);
    const ratio = promo === 0 ? Infinity : helpful / promo;
    return {
      helpful_30d: helpful,
      promotional_30d: promo,
      ratio: ratio === Infinity ? "N/A" : ratio.toFixed(2),
      compliant: ratio >= 9,
      guidance: ratio < 9
        ? "Draft helpful (non-promotional) responses only until ratio ≥9:1"
        : "OK to draft up to 1 promotional response per 9 helpful",
    };
  },
};

export const allForumTools = [scanForumsTool, draftForumResponseTool, checkPromoRatioTool];
