// src/tools/content/tools.ts
// Tools for the CMO to draft and publish SEO content.
// Drafts go to a `blog_drafts` table; publish_to_prod requires approval.

import type { AgentTool } from "@/agents-framework/types";

export const draftBlogPostTool: AgentTool<{
  targetKeyword: string;
  title: string;
  metaDescription: string;
  slug: string;
  markdownContent: string;
  internalLinks: string[];
  rationale: string;
}> = {
  name: "content_draft_blog_post",
  description:
    "Draft an SEO-optimized blog post targeting a specific keyword. Saves to draft table for review. Always auto — drafting is free.",
  inputSchema: {
    type: "object",
    properties: {
      targetKeyword: { type: "string" },
      title: { type: "string", description: "≤60 chars, include primary keyword near front" },
      metaDescription: { type: "string", description: "≤155 chars" },
      slug: { type: "string" },
      markdownContent: {
        type: "string",
        description: "Full post in markdown. ≥1200 words, with H2/H3 structure, target keyword in first 100 words.",
      },
      internalLinks: {
        type: "array",
        items: { type: "string" },
        description: "Existing Keywise pages to link to (e.g. /pricing, /features/rent-collection)",
      },
      rationale: { type: "string", description: "Why this post + keyword choice" },
    },
    required: ["targetKeyword", "title", "metaDescription", "slug", "markdownContent", "internalLinks", "rationale"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Draft blog: "${i.title}" targeting "${i.targetKeyword}"`,
  estimateImpact: (i) =>
    `Targeting "${i.targetKeyword}" (~${i.markdownContent.split(/\s+/).length} words)`,
  execute: async (i, ctx) => {
    // Check for slug collision
    const { data: existing } = await ctx.supabase
      .from("blog_drafts")
      .select("id, status")
      .eq("slug", i.slug)
      .maybeSingle();
    if (existing) {
      throw new Error(`Slug "${i.slug}" already exists (id=${existing.id}, status=${existing.status}). Use a different slug.`);
    }

    const { data, error } = await ctx.supabase
      .from("blog_drafts")
      .insert({
        slug: i.slug,
        title: i.title,
        meta_description: i.metaDescription,
        target_keyword: i.targetKeyword,
        markdown: i.markdownContent,
        internal_links: i.internalLinks,
        status: "draft",
        created_by: "agent:cmo",
        rationale: i.rationale,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { draftId: data.id, previewUrl: `/admin/agents` };
  },
};

export const publishBlogPostTool: AgentTool<{ draftId: string; reason: string }> = {
  name: "content_publish_blog_post",
  description:
    "Publish a previously-drafted blog post to production. Always requires approval since it goes live on the public site.",
  inputSchema: {
    type: "object",
    properties: {
      draftId: { type: "string" },
      reason: { type: "string" },
    },
    required: ["draftId", "reason"],
  },
  defaultAuthority: "approve",
  describeAction: (i) => `Publish blog draft ${i.draftId}`,
  execute: async (i, ctx) => {
    // Verify draft exists and is in draft state
    const { data: draft } = await ctx.supabase
      .from("blog_drafts")
      .select("id, status, slug")
      .eq("id", i.draftId)
      .maybeSingle();
    if (!draft) throw new Error(`Draft ${i.draftId} not found.`);
    if (draft.status === "published") throw new Error(`Draft ${i.draftId} is already published.`);

    const { error } = await ctx.supabase
      .from("blog_drafts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", i.draftId);
    if (error) throw error;
    return { ok: true, slug: draft.slug, url: `/blog/${draft.slug}` };
  },
};

export const allContentTools = [draftBlogPostTool, publishBlogPostTool];
