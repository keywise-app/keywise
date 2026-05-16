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

export const updateBlogPostTool: AgentTool<{
  draftId: string;
  title?: string;
  metaDescription?: string;
  markdownContent: string;
  internalLinks?: string[];
  rationale: string;
}> = {
  name: "content_update_blog_post",
  description:
    "Update an existing published or draft blog post with refreshed content. Use for content refreshes — updated stats, current year references, expanded sections, new internal links. Sets updated_at to now. Requires approval for published posts (content goes live immediately).",
  inputSchema: {
    type: "object",
    properties: {
      draftId: { type: "string", description: "ID of the blog_drafts row to update" },
      title: { type: "string", description: "Updated title (optional — omit to keep existing)" },
      metaDescription: { type: "string", description: "Updated meta description (optional)" },
      markdownContent: { type: "string", description: "Full updated markdown content" },
      internalLinks: { type: "array", items: { type: "string" }, description: "Updated internal link targets" },
      rationale: { type: "string", description: "What changed and why this refresh matters" },
    },
    required: ["draftId", "markdownContent", "rationale"],
  },
  defaultAuthority: "approve",
  resolveAuthority: async (i, ctx) => {
    const { data } = await ctx.supabase
      .from("blog_drafts")
      .select("status")
      .eq("id", i.draftId)
      .maybeSingle();
    // Draft updates are auto; published updates need approval (live content)
    return data?.status === "published" ? "approve" : "auto";
  },
  describeAction: (i) => `Update blog post ${i.draftId} (${i.rationale.slice(0, 60)})`,
  estimateImpact: () => "Refreshed content typically gains 5-20 positions within 2-4 weeks",
  execute: async (i, ctx) => {
    const { data: existing } = await ctx.supabase
      .from("blog_drafts")
      .select("id, slug, status")
      .eq("id", i.draftId)
      .maybeSingle();
    if (!existing) throw new Error(`Draft ${i.draftId} not found.`);

    const update: Record<string, any> = {
      markdown: i.markdownContent,
      rationale: i.rationale,
    };
    if (i.title) update.title = i.title;
    if (i.metaDescription) update.meta_description = i.metaDescription;
    if (i.internalLinks) update.internal_links = i.internalLinks;

    const { error } = await ctx.supabase
      .from("blog_drafts")
      .update(update)
      .eq("id", i.draftId);
    if (error) throw error;

    return { ok: true, slug: existing.slug, status: existing.status, url: `/blog/${existing.slug}` };
  },
};

export const listPublishedPostsTool: AgentTool<{}> = {
  name: "content_list_published",
  description:
    "List all published blog posts with their slug, title, target keyword, word count, and published date. Use to identify refresh candidates (old posts that may need updating).",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "List all published blog posts",
  execute: async (_, ctx) => {
    const { data } = await ctx.supabase
      .from("blog_drafts")
      .select("id, slug, title, target_keyword, word_count, published_at, meta_description")
      .eq("status", "published")
      .order("published_at", { ascending: true });
    return { posts: data || [], count: (data || []).length };
  },
};

export const proposeToolPageTool: AgentTool<{
  slug: string;
  title: string;
  targetKeyword: string;
  searchIntent: string;
  featureSpec: string;
  competitorGap: string;
  backlinkPotential: string;
  rationale: string;
}> = {
  name: "content_propose_tool_page",
  description:
    "Propose a free public tool or calculator for keywise.app/tools/<slug>. These are product features (not blog posts) — they get built by the dev team. The CMO identifies WHICH to build based on keyword opportunity, competitor gaps, and backlink potential. Saves to agent_memory for Chris to review.",
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "URL slug, e.g. 'rent-calculator-california'" },
      title: { type: "string", description: "Public-facing title, e.g. 'California Fair Market Rent Calculator'" },
      targetKeyword: { type: "string", description: "Primary keyword this tool would rank for" },
      searchIntent: { type: "string", description: "commercial | informational | transactional" },
      featureSpec: { type: "string", description: "What the tool does — inputs, outputs, data sources, 3-5 sentences" },
      competitorGap: { type: "string", description: "Why no competitor owns this keyword/tool yet" },
      backlinkPotential: { type: "string", description: "Why other sites would link to this (resource pages, roundups, etc.)" },
      rationale: { type: "string", description: "Why this tool over alternatives — tie to ICP and acquisition strategy" },
    },
    required: ["slug", "title", "targetKeyword", "searchIntent", "featureSpec", "competitorGap", "backlinkPotential", "rationale"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Propose tool: "${i.title}" targeting "${i.targetKeyword}"`,
  execute: async (i, ctx) => {
    // Save to agent_memory so it persists and shows in the dashboard
    const key = `tool_proposal:${i.slug}`;
    await ctx.supabase
      .from("agent_memory")
      .upsert(
        {
          role: ctx.role,
          key,
          value: {
            slug: i.slug,
            title: i.title,
            targetKeyword: i.targetKeyword,
            searchIntent: i.searchIntent,
            featureSpec: i.featureSpec,
            competitorGap: i.competitorGap,
            backlinkPotential: i.backlinkPotential,
            rationale: i.rationale,
            proposedAt: new Date().toISOString(),
          },
          importance: 4,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "role,key" }
      );
    return { saved: true, key, url: `/tools/${i.slug}` };
  },
};

export const allContentTools = [
  draftBlogPostTool,
  publishBlogPostTool,
  updateBlogPostTool,
  listPublishedPostsTool,
  proposeToolPageTool,
];
