// lib/agent-tools/social/tools.ts
// Real Instagram publishing tools (draft → publish) backed by the Meta Graph API.
//
// Rebuilt 2026-09 as a REAL integration (the previous version was a mock stub and
// was cut in commit b364592 "cut fake automation"). Publishing goes through the
// human-approval gate by DEFAULT, matching this codebase's design ("no auto-publish
// path"); set IG_AUTOPUBLISH=true to opt into true unattended posting once you trust
// the pipeline. See docs/instagram-auto-posting.md and ./instagram.ts.

import type { AgentTool } from "@/agents-framework/types";
import { publishInstagram, detectMediaType, autoPublishEnabled } from "./instagram";

const MAX_CAPTION = 2200; // Instagram caption limit
const MAX_HASHTAGS = 30; // Instagram hashtag limit

function validateCaption(caption: string): string | null {
  if (caption.length > MAX_CAPTION) return `Caption too long: ${caption.length}/${MAX_CAPTION} chars`;
  const tags = (caption.match(/#[\w]+/g) || []).length;
  if (tags > MAX_HASHTAGS) return `Too many hashtags: ${tags}/${MAX_HASHTAGS}`;
  return null;
}

export const draftSocialPostTool: AgentTool<{
  caption: string;
  mediaUrls: string[];
  campaignTag: string;
  reasoning: string;
}> = {
  name: "social_draft_post",
  description:
    "Draft an Instagram post (photo or Reel). Saves to social_posts as 'draft'. " +
    "mediaUrls must be publicly reachable https URLs (the Instagram API fetches media " +
    "server-side; it cannot take a raw upload). Then call social_publish_post to put it live. " +
    "Caption limit 2200 chars, max 30 hashtags.",
  inputSchema: {
    type: "object",
    properties: {
      caption: { type: "string", description: "The post caption (front-load the hook; end with a question)." },
      mediaUrls: {
        type: "array",
        items: { type: "string" },
        description: "Public https URL(s) to the image (.jpg/.png) or Reel video (.mp4/.mov).",
      },
      campaignTag: { type: "string", description: "'reel' | 'carousel' | 'tip' | 'market_data' | 'relatability'" },
      reasoning: { type: "string" },
    },
    required: ["caption", "mediaUrls", "campaignTag", "reasoning"],
  },
  defaultAuthority: "auto", // drafting never publishes — safe to auto
  describeAction: (i) => `Draft IG post: "${i.caption.slice(0, 50)}..."`,
  execute: async (i, ctx) => {
    if (!i.mediaUrls || i.mediaUrls.length === 0) {
      return { error: "Instagram posts require at least one media URL (photo or video)." };
    }
    const capErr = validateCaption(i.caption);
    if (capErr) return { error: capErr };

    const { data, error } = await ctx.supabase
      .from("social_posts")
      .insert({
        platform: "instagram",
        text: i.caption,
        media_urls: i.mediaUrls,
        campaign_tag: i.campaignTag,
        reasoning: i.reasoning,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { draftId: data.id };
  },
};

export const publishSocialPostTool: AgentTool<{
  draftId: string;
  reason: string;
}> = {
  name: "social_publish_post",
  description:
    "Publish a previously-drafted Instagram post live via the Meta Graph API. " +
    "Requires IG_USER_ID and IG_ACCESS_TOKEN env vars. Goes through human approval by " +
    "default; auto-executes only when IG_AUTOPUBLISH=true.",
  inputSchema: {
    type: "object",
    properties: {
      draftId: { type: "string" },
      reason: { type: "string" },
    },
    required: ["draftId", "reason"],
  },
  defaultAuthority: "approve",
  // Real posting to a live account is gated behind a human unless explicitly opted out.
  resolveAuthority: async () => (autoPublishEnabled() ? "auto" : "approve"),
  describeAction: (i) => `Publish IG draft ${i.draftId} (live post)`,
  estimateImpact: async (i, ctx) => {
    const { data } = await ctx.supabase
      .from("social_posts")
      .select("text")
      .eq("id", i.draftId)
      .single();
    const preview = data?.text ? `: "${data.text.slice(0, 40)}..."` : "";
    return `Live Instagram post${preview}`;
  },
  execute: async (i, ctx) => {
    const { data: post, error } = await ctx.supabase
      .from("social_posts")
      .select("*")
      .eq("id", i.draftId)
      .single();
    if (error || !post) throw new Error(`Draft ${i.draftId} not found`);
    if (post.platform !== "instagram") {
      throw new Error(`social_publish_post only supports Instagram (got '${post.platform}')`);
    }
    const mediaUrl: string | undefined = post.media_urls?.[0];
    if (!mediaUrl) throw new Error(`Draft ${i.draftId} has no media_urls — Instagram requires media`);

    let result: { id: string; url: string };
    try {
      result = await publishInstagram({
        caption: post.text,
        mediaUrl,
        mediaType: detectMediaType(mediaUrl),
      });
    } catch (e: any) {
      await ctx.supabase.from("social_posts").update({ status: "failed" }).eq("id", i.draftId);
      throw e;
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
  description: "List recently-posted Instagram posts to learn what's been published.",
  inputSchema: {
    type: "object",
    properties: { days: { type: "number" } },
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Recent IG posts (${i.days ?? 14}d)`,
  execute: async (i, ctx) => {
    const since = new Date(Date.now() - (i.days ?? 14) * 86400_000).toISOString();
    const { data } = await ctx.supabase
      .from("social_posts")
      .select("text, campaign_tag, posted_at, external_url, status")
      .eq("platform", "instagram")
      .eq("status", "posted")
      .gte("posted_at", since)
      .order("posted_at", { ascending: false });
    return { posts: data ?? [] };
  },
};

export const allSocialTools = [
  draftSocialPostTool,
  publishSocialPostTool,
  recentSocialPerformanceTool,
];
