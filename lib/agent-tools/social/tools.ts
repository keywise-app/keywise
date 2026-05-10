// src/tools/social/tools.ts
// Auto-post on owned channels (Twitter/X, Bluesky). Draft on Reddit/LinkedIn.

import type { AgentTool } from "@/agents-framework/types";

// ─────────────────────────────────────────────────────────────────
// Platform clients (stubs — wire when ready)
// ─────────────────────────────────────────────────────────────────

// Twitter/X — pay-per-use as of Feb 2026.
// $0.015/post text-only, $0.20/post if it contains a URL (huge jump April 2026).
// Therefore: prefer text-only when economically sensible; the agent decides.
async function postToTwitter(text: string, _linkUrl?: string): Promise<{ id: string; url: string }> {
  // TODO: real call via twitter-api-v2 package, OAuth 2.0 with PKCE
  // const client = new TwitterApi({ ...creds });
  // const { data } = await client.v2.tweet(text);
  console.log(`[twitter] would post: ${text.slice(0, 60)}...`);
  return { id: `mock-tw-${Date.now()}`, url: `https://x.com/keywise/status/mock` };
}

// Bluesky — free, app password auth, 300 graphemes, generous rate limits.
async function postToBluesky(text: string, _linkUrl?: string): Promise<{ id: string; url: string }> {
  // TODO: real call via @atproto/api
  // const agent = new BskyAgent({ service: 'https://bsky.social' });
  // await agent.login({ identifier: handle, password: appPassword });
  // const res = await agent.post({ text, createdAt: new Date().toISOString() });
  console.log(`[bluesky] would post: ${text.slice(0, 60)}...`);
  return { id: `mock-bsky-${Date.now()}`, url: `https://bsky.app/profile/keywise.app/post/mock` };
}

// ─────────────────────────────────────────────────────────────────
// Tools
// ─────────────────────────────────────────────────────────────────

export const draftSocialPostTool: AgentTool<{
  platforms: ("twitter" | "bluesky" | "linkedin" | "threads")[];
  text: string;
  linkUrl?: string;
  campaignTag: string;
  reasoning: string;
}> = {
  name: "social_draft_post",
  description:
    "Draft a social post for one or more platforms. Saves to social_posts as 'draft'. Use this first, then call social_publish_post to put it live (auto for owned, approve for LinkedIn). Twitter limit: 280 chars. Bluesky: 300 graphemes. LinkedIn: 3000 chars.",
  inputSchema: {
    type: "object",
    properties: {
      platforms: {
        type: "array",
        items: { type: "string", enum: ["twitter", "bluesky", "linkedin", "threads"] },
      },
      text: { type: "string" },
      linkUrl: { type: "string", description: "Optional link to embed/share" },
      campaignTag: {
        type: "string",
        description: "'blog_announce' | 'tip' | 'feature_launch' | 'reply' | 'thread' | 'milestone'",
      },
      reasoning: { type: "string" },
    },
    required: ["platforms", "text", "campaignTag", "reasoning"],
  },
  defaultAuthority: "auto",
  describeAction: (i) =>
    `Draft post for ${i.platforms.join(",")}: "${i.text.slice(0, 50)}..."`,
  execute: async (i, ctx) => {
    const ids: string[] = [];
    for (const platform of i.platforms) {
      // Per-platform length checks
      const limit = platform === "twitter" ? 280 : platform === "bluesky" ? 300 : platform === "linkedin" ? 3000 : 500;
      if (i.text.length > limit) {
        return {
          error: `Text too long for ${platform}: ${i.text.length}/${limit} chars`,
        };
      }
      const { data, error } = await ctx.supabase
        .from("social_posts")
        .insert({
          platform,
          text: i.text,
          link_url: i.linkUrl,
          campaign_tag: i.campaignTag,
          reasoning: i.reasoning,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      ids.push(data.id);
    }
    return { draftIds: ids };
  },
};

export const publishSocialPostTool: AgentTool<{
  draftId: string;
  reason: string;
}> = {
  name: "social_publish_post",
  description:
    "Publish a previously-drafted social post. Auto-executes for Twitter/X and Bluesky (owned accounts). Queues for approval on LinkedIn (needs manual posting since LinkedIn API access is gated). Reddit posting NEVER goes through this tool — use forum_draft_response instead.",
  inputSchema: {
    type: "object",
    properties: {
      draftId: { type: "string" },
      reason: { type: "string" },
    },
    required: ["draftId", "reason"],
  },
  defaultAuthority: "approve",
  resolveAuthority: async (i, ctx) => {
    // Look up the platform; auto for Twitter/Bluesky, approve for LinkedIn/Threads
    const { data } = await ctx.supabase
      .from("social_posts")
      .select("platform, link_url")
      .eq("id", i.draftId)
      .single();
    if (!data) return "approve";
    if (data.platform === "twitter" || data.platform === "bluesky") {
      // Twitter URL posts cost $0.20 each. Still auto, but the agent should know.
      return "auto";
    }
    return "approve";
  },
  describeAction: (i) => `Publish social draft ${i.draftId}`,
  estimateImpact: async (i, ctx) => {
    const { data } = await ctx.supabase
      .from("social_posts")
      .select("platform, link_url")
      .eq("id", i.draftId)
      .single();
    if (!data) return "unknown";
    if (data.platform === "twitter") {
      return data.link_url ? "$0.20 X API cost (URL post)" : "$0.015 X API cost";
    }
    return data.platform;
  },
  execute: async (i, ctx) => {
    const { data: post, error } = await ctx.supabase
      .from("social_posts")
      .select("*")
      .eq("id", i.draftId)
      .single();
    if (error || !post) throw new Error(`Draft ${i.draftId} not found`);

    let result: { id: string; url: string };
    if (post.platform === "twitter") {
      result = await postToTwitter(post.text, post.link_url);
    } else if (post.platform === "bluesky") {
      result = await postToBluesky(post.text, post.link_url);
    } else {
      throw new Error(
        `Auto-posting not available for ${post.platform}. This should be handled via approval queue, not direct execute.`
      );
    }

    await ctx.supabase
      .from("social_posts")
      .update({
        status: "posted",
        posted_at: new Date().toISOString(),
        external_id: result.id,
        external_url: result.url,
      })
      .eq("id", i.draftId);

    return result;
  },
};

export const recentSocialPerformanceTool: AgentTool<{ days?: number }> = {
  name: "social_recent_performance",
  description: "Get recent social posts and (when wired) their engagement to learn what works.",
  inputSchema: {
    type: "object",
    properties: { days: { type: "number" } },
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Recent social posts (${i.days ?? 14}d)`,
  execute: async (i, ctx) => {
    const since = new Date(Date.now() - (i.days ?? 14) * 86400_000).toISOString();
    const { data } = await ctx.supabase
      .from("social_posts")
      .select("platform, text, campaign_tag, posted_at, external_url, status")
      .gte("posted_at", since)
      .eq("status", "posted")
      .order("posted_at", { ascending: false });
    return { posts: data ?? [] };
  },
};

export const allSocialTools = [
  draftSocialPostTool,
  publishSocialPostTool,
  recentSocialPerformanceTool,
];
