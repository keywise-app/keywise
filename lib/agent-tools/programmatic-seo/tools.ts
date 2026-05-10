// src/tools/programmatic-seo/tools.ts
// Generate templated SEO pages from real data.
// CRITICAL: Google penalizes thin/duplicate AI content. Each page must have
// substantive unique content — real local data, real laws, etc. The agent
// is instructed to refuse generation for templates without real data.

import type { AgentTool } from "@/agents-framework/types";

export const createPseoTemplateTool: AgentTool<{
  name: string;
  urlPattern: string;
  titlePattern: string;
  introPattern: string;
  requiredDataKeys: string[];
  rationale: string;
}> = {
  name: "pseo_create_template",
  description:
    "Create a programmatic SEO template (e.g. '/property-management-software-{city}'). Always requires approval — these create lots of pages and Google penalizes thin AI content if done poorly.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      urlPattern: { type: "string", description: "e.g. '/property-management-software-{city}'" },
      titlePattern: { type: "string" },
      introPattern: { type: "string" },
      requiredDataKeys: {
        type: "array",
        items: { type: "string" },
        description: "Variables the template expects, e.g. ['city','state','population','rent_median']",
      },
      rationale: { type: "string" },
    },
    required: ["name", "urlPattern", "titlePattern", "introPattern", "requiredDataKeys", "rationale"],
  },
  defaultAuthority: "approve", // big SEO commitment; Chris should review the template
  describeAction: (i) => `Create pSEO template "${i.name}"`,
  execute: async (i, ctx) => {
    const { data, error } = await ctx.supabase
      .from("pseo_templates")
      .insert({
        name: i.name,
        url_pattern: i.urlPattern,
        title_pattern: i.titlePattern,
        intro_pattern: i.introPattern,
        required_data_keys: i.requiredDataKeys,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { templateId: data.id };
  },
};

export const generatePseoPageTool: AgentTool<{
  templateId: string;
  slug: string;
  title: string;
  metaDescription: string;
  data: Record<string, any>;
  bodyMarkdown: string;
  reasoning: string;
}> = {
  name: "pseo_generate_page",
  description:
    "Generate a single programmatic SEO page from a template. Auto for drafts. Body MUST be ≥800 words of substantive content with real data — no thin pages. Google penalizes AI doorway pages aggressively. Pages stay 'draft' until you bulk-publish via approval.",
  inputSchema: {
    type: "object",
    properties: {
      templateId: { type: "string" },
      slug: { type: "string" },
      title: { type: "string" },
      metaDescription: { type: "string" },
      data: { type: "object", description: "Variables (city, state, etc) used in the page" },
      bodyMarkdown: {
        type: "string",
        description:
          "Full page body. Must include: real local data (population, rent stats), specific local context (laws, common challenges), how Keywise helps the specific audience, internal links to /pricing and relevant features. ≥800 words.",
      },
      reasoning: { type: "string" },
    },
    required: ["templateId", "slug", "title", "metaDescription", "data", "bodyMarkdown", "reasoning"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Generate pSEO page: ${i.slug}`,
  execute: async (i, ctx) => {
    const wordCount = i.bodyMarkdown.split(/\s+/).length;
    if (wordCount < 800) {
      return {
        error: `Page too thin: ${wordCount} words. Minimum 800. Add more substantive local data, examples, or context.`,
      };
    }
    const { data, error } = await ctx.supabase
      .from("pseo_pages")
      .insert({
        template_id: i.templateId,
        slug: i.slug,
        title: i.title,
        meta_description: i.metaDescription,
        data: i.data,
        body_markdown: i.bodyMarkdown,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { pageId: data.id, wordCount };
  },
};

export const publishPseoPagesTool: AgentTool<{
  pageIds: string[];
  reason: string;
}> = {
  name: "pseo_publish_pages",
  description:
    "Bulk-publish pSEO draft pages to production. Always requires approval. Publishing many pages at once can trigger Google manual review — recommend batches of ≤20.",
  inputSchema: {
    type: "object",
    properties: {
      pageIds: { type: "array", items: { type: "string" } },
      reason: { type: "string" },
    },
    required: ["pageIds", "reason"],
  },
  defaultAuthority: "approve",
  describeAction: (i) => `Publish ${i.pageIds.length} pSEO pages`,
  estimateImpact: (i) => `${i.pageIds.length} pages live`,
  execute: async (i, ctx) => {
    if (i.pageIds.length > 20) {
      return {
        warning: "Batch >20 pages — recommend splitting to avoid Google manual review",
      };
    }
    const { error } = await ctx.supabase
      .from("pseo_pages")
      .update({ status: "published", published_at: new Date().toISOString() })
      .in("id", i.pageIds);
    if (error) throw error;
    return { published: i.pageIds.length };
  },
};

export const allPseoTools = [
  createPseoTemplateTool,
  generatePseoPageTool,
  publishPseoPagesTool,
];
