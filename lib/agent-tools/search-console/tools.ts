// src/tools/search-console/tools.ts
// Wraps Google Search Console API. Stubbed where it would hit Google's API.
// To go live: npm install googleapis  +  set GOOGLE_SC_REFRESH_TOKEN, GOOGLE_SC_SITE_URL

import type { AgentTool } from "@/agents-framework/types";

export interface SearchQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PageRow {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function fetchTopQueries(_days: number): Promise<SearchQueryRow[]> {
  // TODO replace with searchconsole.searchanalytics.query
  return [
    { query: "ai property management software", clicks: 18, impressions: 412, ctr: 0.044, position: 8.2 },
    { query: "free landlord app", clicks: 11, impressions: 802, ctr: 0.014, position: 14.1 },
    { query: "rent collection stripe", clicks: 6, impressions: 91, ctr: 0.066, position: 6.4 },
    { query: "property management for small landlords", clicks: 4, impressions: 290, ctr: 0.014, position: 18.7 },
  ];
}

async function fetchTopPages(_days: number): Promise<PageRow[]> {
  return [
    { url: "/", clicks: 24, impressions: 950, ctr: 0.025, position: 11.0 },
    { url: "/blog/ai-property-management", clicks: 14, impressions: 380, ctr: 0.037, position: 7.5 },
    { url: "/pricing", clicks: 8, impressions: 120, ctr: 0.067, position: 5.1 },
  ];
}

async function fetchOpportunityKeywords(): Promise<SearchQueryRow[]> {
  // Queries on page 2 of Google (positions 11-20) — easy ranking wins
  const all = await fetchTopQueries(28);
  return all.filter((q) => q.position >= 8 && q.position <= 20 && q.impressions >= 100);
}

export const topQueriesTool: AgentTool<{ days?: number }> = {
  name: "sc_top_queries",
  description: "Top search queries bringing traffic from Google in the last N days (default 28).",
  inputSchema: {
    type: "object",
    properties: { days: { type: "number" } },
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Get top SC queries (${i.days ?? 28}d)`,
  execute: async (i) => ({ queries: await fetchTopQueries(i.days ?? 28) }),
};

export const topPagesTool: AgentTool<{ days?: number }> = {
  name: "sc_top_pages",
  description: "Top pages by Google clicks/impressions in the last N days.",
  inputSchema: {
    type: "object",
    properties: { days: { type: "number" } },
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Get top SC pages (${i.days ?? 28}d)`,
  execute: async (i) => ({ pages: await fetchTopPages(i.days ?? 28) }),
};

export const opportunityKeywordsTool: AgentTool<{}> = {
  name: "sc_opportunity_keywords",
  description:
    "Find queries currently ranking on page 2 (positions 8-20) with decent impressions — best targets for content optimization.",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "Find SEO opportunity keywords (page 2 ranks)",
  execute: async () => ({ opportunities: await fetchOpportunityKeywords() }),
};

export const allSearchConsoleTools = [
  topQueriesTool,
  topPagesTool,
  opportunityKeywordsTool,
];
