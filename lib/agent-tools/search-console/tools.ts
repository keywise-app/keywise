// lib/agent-tools/search-console/tools.ts
// Wraps Google Search Console API via live client.

import type { AgentTool } from "@/agents-framework/types";
import {
  fetchTopQueries,
  fetchTopPages,
  fetchOpportunityKeywords,
  type SCQueryRow,
  type SCPageRow,
} from "./client";

export type SearchQueryRow = SCQueryRow;
export type PageRow = SCPageRow;

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
