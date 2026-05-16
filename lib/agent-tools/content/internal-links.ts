// lib/agent-tools/content/internal-links.ts
// Tools for internal link discovery and orphan page detection.

import type { AgentTool } from "@/agents-framework/types";

// Hardcoded static blog slugs (always available, not in blog_drafts)
const STATIC_POSTS = [
  { slug: "late-rent-notice", title: "How to Write a Late Rent Notice (Free Template)" },
  { slug: "move-in-inspection-checklist", title: "Move-In Inspection Checklist for Landlords" },
  { slug: "collect-rent-online", title: "How to Collect Rent Online: Best Options for Small Landlords" },
  { slug: "free-lease-agreement-template", title: "Free Lease Agreement Template for Small Landlords" },
  { slug: "security-deposit-laws", title: "Security Deposit Laws: What Every Landlord Needs to Know" },
  { slug: "property-management-software-comparison", title: "Best Property Management Software for Small Landlords" },
];

const CORE_PAGES = [
  { url: "/", title: "Keywise Home" },
  { url: "/pricing", title: "Keywise Pricing" },
  { url: "/tenant", title: "Tenant Login" },
  { url: "/blog", title: "Keywise Blog" },
  { url: "/contact", title: "Contact Keywise" },
];

export const findInternalLinksTool: AgentTool<{
  draftSlug: string;
  draftTitle: string;
  draftTopics: string[];
}> = {
  name: "content_find_internal_links",
  description:
    "Given a draft blog post's slug, title, and topic keywords, searches all published posts and core pages for natural internal linking opportunities. Returns recommended links with anchor text and target URL. Call this BEFORE publishing a draft to weave in internal links.",
  inputSchema: {
    type: "object",
    properties: {
      draftSlug: { type: "string", description: "Slug of the draft being prepared" },
      draftTitle: { type: "string" },
      draftTopics: {
        type: "array",
        items: { type: "string" },
        description: "3-8 topic keywords the draft covers (e.g. 'rent collection', 'late fees', 'lease renewal')",
      },
    },
    required: ["draftSlug", "draftTitle", "draftTopics"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Find internal links for "${i.draftTitle}"`,
  execute: async (i, ctx) => {
    // Gather all published posts from blog_drafts
    const { data: dbPosts } = await ctx.supabase
      .from("blog_drafts")
      .select("slug, title, target_keyword, meta_description")
      .eq("status", "published");

    const allPosts = [
      ...STATIC_POSTS.map((p) => ({
        slug: p.slug,
        title: p.title,
        url: `/blog/${p.slug}`,
        keywords: p.title.toLowerCase(),
      })),
      ...((dbPosts || [])
        .filter((p: any) => p.slug !== i.draftSlug) // don't link to self
        .map((p: any) => ({
          slug: p.slug,
          title: p.title,
          url: `/blog/${p.slug}`,
          keywords: `${p.title} ${p.target_keyword || ""} ${p.meta_description || ""}`.toLowerCase(),
        }))),
    ];

    // Match topics to existing posts
    const opportunities: {
      targetUrl: string;
      targetTitle: string;
      matchedTopic: string;
      suggestedAnchor: string;
    }[] = [];

    for (const topic of i.draftTopics) {
      const topicLower = topic.toLowerCase();
      for (const post of allPosts) {
        if (post.slug === i.draftSlug) continue;
        const words = topicLower.split(/\s+/);
        const matches = words.filter((w) => post.keywords.includes(w));
        if (matches.length >= Math.max(1, Math.floor(words.length * 0.5))) {
          // Don't duplicate same URL
          if (!opportunities.some((o) => o.targetUrl === post.url)) {
            opportunities.push({
              targetUrl: post.url,
              targetTitle: post.title,
              matchedTopic: topic,
              suggestedAnchor: topic,
            });
          }
        }
      }
    }

    // Also suggest linking to core pages if relevant
    const topicString = i.draftTopics.join(" ").toLowerCase();
    if (topicString.includes("price") || topicString.includes("cost") || topicString.includes("free")) {
      opportunities.push({ targetUrl: "/pricing", targetTitle: "Keywise Pricing", matchedTopic: "pricing", suggestedAnchor: "see Keywise pricing" });
    }

    return {
      draftSlug: i.draftSlug,
      linkOpportunities: opportunities.slice(0, 8),
      totalPublishedPosts: allPosts.length,
      note: opportunities.length === 0
        ? "No strong internal link matches found. Consider broadening draft topics or adding related posts first."
        : `Found ${opportunities.length} linking opportunities. Weave these into the draft markdown before publishing.`,
    };
  },
};

export const auditOrphanedPagesTool: AgentTool<{}> = {
  name: "content_audit_orphaned_pages",
  description:
    "Find published blog posts with fewer than 3 inbound internal links from other posts. These 'orphaned' pages get less Google juice and rank worse. Returns the top orphans with suggested posts that should link to them.",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "Audit orphaned pages (low internal links)",
  execute: async (_, ctx) => {
    // Get all published drafts
    const { data: dbPosts } = await ctx.supabase
      .from("blog_drafts")
      .select("slug, title, target_keyword, markdown, internal_links")
      .eq("status", "published");

    const allPosts = [
      ...STATIC_POSTS.map((p) => ({
        slug: p.slug,
        title: p.title,
        url: `/blog/${p.slug}`,
        isStatic: true,
        markdown: "", // can't read static file content from here
        internalLinks: [] as string[],
      })),
      ...((dbPosts || []).map((p: any) => ({
        slug: p.slug,
        title: p.title,
        url: `/blog/${p.slug}`,
        isStatic: false,
        markdown: p.markdown || "",
        internalLinks: p.internal_links || [],
      }))),
    ];

    // Count inbound links for each post
    const inboundCount: Record<string, { count: number; from: string[] }> = {};
    for (const post of allPosts) {
      inboundCount[post.slug] = { count: 0, from: [] };
    }

    for (const post of allPosts) {
      const content = `${post.markdown} ${post.internalLinks.join(" ")}`;
      for (const target of allPosts) {
        if (target.slug === post.slug) continue;
        if (
          content.includes(`/blog/${target.slug}`) ||
          content.includes(target.slug)
        ) {
          if (inboundCount[target.slug]) {
            inboundCount[target.slug].count++;
            inboundCount[target.slug].from.push(post.slug);
          }
        }
      }
    }

    // Find orphans (< 3 inbound links)
    const orphans = allPosts
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        url: p.url,
        inboundLinks: inboundCount[p.slug]?.count ?? 0,
        linkedFrom: inboundCount[p.slug]?.from ?? [],
        isStatic: p.isStatic,
      }))
      .filter((p) => p.inboundLinks < 3)
      .sort((a, b) => a.inboundLinks - b.inboundLinks);

    // For each orphan, suggest which posts could link to it
    const suggestions = orphans.slice(0, 5).map((orphan) => {
      const potentialLinkers = allPosts
        .filter((p) => p.slug !== orphan.slug && !orphan.linkedFrom.includes(p.slug))
        .slice(0, 3)
        .map((p) => ({ slug: p.slug, title: p.title }));
      return {
        ...orphan,
        suggestedLinkers: potentialLinkers,
      };
    });

    return {
      totalPosts: allPosts.length,
      orphanedPosts: orphans.length,
      topOrphans: suggestions,
      note: orphans.length === 0
        ? "All posts have 3+ inbound internal links. Internal linking looks healthy."
        : `${orphans.length} posts have fewer than 3 inbound links. Focus link-building on the top orphans listed above.`,
    };
  },
};

export const allInternalLinkTools = [findInternalLinksTool, auditOrphanedPagesTool];
