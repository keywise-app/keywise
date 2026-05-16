// lib/agent-tools/content/serp-analysis.ts
// Pre-draft SERP research: analyze what's ranking, find gaps, generate a content brief.

import type { AgentTool } from "@/agents-framework/types";
import { fetchTopQueries, fetchTopPages } from "@/agent-tools/search-console/client";

export const analyzeSerpTool: AgentTool<{
  targetKeyword: string;
  intent: "commercial" | "informational" | "comparison";
}> = {
  name: "content_analyze_serp",
  description:
    "Analyze the SERP landscape for a target keyword BEFORE drafting. Returns: our current ranking (if any), top queries we rank for in this topic cluster, related pages on our site, and a gap analysis prompt. Call this first, then use the output to inform content_draft_blog_post.",
  inputSchema: {
    type: "object",
    properties: {
      targetKeyword: { type: "string", description: "The primary keyword to analyze" },
      intent: {
        type: "string",
        enum: ["commercial", "informational", "comparison"],
        description: "Search intent: commercial (wants to buy), informational (wants to learn), comparison (evaluating options)",
      },
    },
    required: ["targetKeyword", "intent"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `SERP analysis for "${i.targetKeyword}"`,
  execute: async (i, ctx) => {
    // 1. Check our current performance for this keyword via SC
    const queries = await fetchTopQueries(28);
    const pages = await fetchTopPages(28);

    // Find if we already rank for this or related terms
    const kwLower = i.targetKeyword.toLowerCase();
    const kwWords = kwLower.split(/\s+/);

    const ourRanking = queries.find(q => q.query.toLowerCase() === kwLower);
    const relatedQueries = queries.filter(q => {
      const qWords = q.query.toLowerCase().split(/\s+/);
      const overlap = kwWords.filter(w => qWords.includes(w));
      return overlap.length >= Math.max(1, Math.floor(kwWords.length * 0.4)) && q.query.toLowerCase() !== kwLower;
    }).slice(0, 8);

    // Find our pages that might be relevant
    const relatedPages = pages.filter(p => {
      const urlLower = p.url.toLowerCase();
      return kwWords.some(w => urlLower.includes(w));
    }).slice(0, 5);

    // 2. Check existing published posts for overlap
    const { data: existingPosts } = await ctx.supabase
      .from("blog_drafts")
      .select("slug, title, target_keyword, word_count")
      .eq("status", "published");

    const overlappingPosts = (existingPosts || []).filter((p: any) => {
      const titleLower = (p.title || "").toLowerCase();
      const kwLower2 = (p.target_keyword || "").toLowerCase();
      return kwWords.some(w => titleLower.includes(w) || kwLower2.includes(w));
    });

    // 3. Build the gap brief
    const brief = buildGapBrief(i.targetKeyword, i.intent, ourRanking, relatedQueries, overlappingPosts);

    return {
      targetKeyword: i.targetKeyword,
      intent: i.intent,
      ourCurrentRanking: ourRanking
        ? { position: ourRanking.position, clicks: ourRanking.clicks, impressions: ourRanking.impressions }
        : null,
      relatedQueriesWeRankFor: relatedQueries.map(q => ({
        query: q.query, position: q.position, impressions: q.impressions,
      })),
      ourRelatedPages: relatedPages.map(p => ({ url: p.url, clicks: p.clicks, position: p.position })),
      existingOverlappingPosts: overlappingPosts.map((p: any) => ({
        slug: p.slug, title: p.title, wordCount: p.word_count,
      })),
      gapBrief: brief,
      instruction: "Use this gap brief to inform your content_draft_blog_post call. Your draft should be 1.5x more comprehensive than what's currently ranking. Cover every topic in the brief's 'must_cover' list and add the 'differentiators' that competitors miss.",
    };
  },
};

function buildGapBrief(
  keyword: string,
  intent: string,
  ourRanking: any,
  relatedQueries: any[],
  overlappingPosts: any[]
): {
  targetWordCount: number;
  must_cover: string[];
  differentiators: string[];
  cannibalization_risk: string | null;
  recommended_angle: string;
} {
  // Base word count by intent
  const baseWordCount = intent === "comparison" ? 2500 : intent === "commercial" ? 2000 : 1800;

  // If we have related queries, those are subtopics to cover
  const subtopics = relatedQueries.map(q => q.query);

  // Standard must-cover topics for landlord content
  const mustCover: string[] = [];

  if (intent === "commercial") {
    mustCover.push(
      `Direct answer to "${keyword}" in the first 100 words`,
      "Specific pricing comparison (cite real numbers: Keywise $19/mo vs competitors)",
      "Feature-by-feature breakdown with pros/cons",
      "Who this is best for (4-10 unit independent landlords)",
      "Setup time and learning curve",
      "Real-world example or scenario",
      ...subtopics.slice(0, 4).map(s => `Subtopic: "${s}" (we rank for this — cover it)`),
    );
  } else if (intent === "comparison") {
    mustCover.push(
      "Head-to-head comparison table",
      "Pricing for every option (with current year numbers)",
      "Honest pros AND cons for each (including Keywise)",
      "Recommendation by landlord size (1-2 units, 3-10 units, 10+)",
      "Real cost calculation (monthly + per-transaction)",
      ...subtopics.slice(0, 3).map(s => `Related comparison: "${s}"`),
    );
  } else {
    mustCover.push(
      `Clear answer to "${keyword}" in the opening paragraph`,
      "Step-by-step actionable instructions",
      "Common mistakes to avoid",
      "Legal considerations (if applicable to landlords)",
      "Free template or checklist (if relevant)",
      ...subtopics.slice(0, 4).map(s => `Related question: "${s}"`),
    );
  }

  // Differentiators — what competitors typically miss
  const differentiators = [
    "First-person landlord perspective (Chris owns a duplex — use this credibility)",
    "Specific dollar amounts and real examples (not generic advice)",
    "AI lease extraction mention where naturally relevant (strongest differentiator)",
    "Internal links to related Keywise blog posts and /pricing",
    "Current year data and references (never stale)",
  ];

  // Cannibalization check
  let cannibalizationRisk: string | null = null;
  if (overlappingPosts.length > 0) {
    const existing = overlappingPosts[0];
    cannibalizationRisk = `WARNING: existing post "${existing.title}" (${existing.word_count || '?'} words, slug: ${existing.slug}) targets a similar keyword. Take a DIFFERENT angle — complementary depth, not duplication. Consider updating the existing post instead of creating a new one.`;
  }

  // Recommended angle
  const angle = ourRanking
    ? `We already rank at position ${ourRanking.position} — this post should strengthen our position, not create a competing page. Consider if content_update_blog_post on the existing URL is better than a new post.`
    : intent === "commercial"
    ? "Lead with the problem this keyword solves, then position Keywise as the solution. Be specific — numbers, steps, real scenarios."
    : "Lead with genuinely helpful content. Earn trust first, mention Keywise only where naturally relevant (last 20% of the post).";

  return {
    targetWordCount: Math.round(baseWordCount * 1.5), // 1.5x competitor benchmark
    must_cover: mustCover,
    differentiators,
    cannibalization_risk: cannibalizationRisk,
    recommended_angle: angle,
  };
}

export const allSerpAnalysisTools = [analyzeSerpTool];
