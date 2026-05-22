// src/tools/google-ads/tools.ts
import type { AgentTool } from "@/agents-framework/types";
import { cmoConfig } from "@/agents/cmo/config";
import * as ads from "./client";

// ─────────────────────────────────────────────────────────────────
// READ tools — always 'auto'
// ─────────────────────────────────────────────────────────────────

export const listCampaignsTool: AgentTool<{}> = {
  name: "ads_list_campaigns",
  description:
    "List all Google Ads campaigns with last 7 days of performance (spend, clicks, conversions, CPA, CTR).",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "List all campaigns",
  execute: async () => ({ campaigns: await ads.listCampaigns() }),
};

export const listAdsTool: AgentTool<{ campaignId: string }> = {
  name: "ads_list_ads",
  description: "List ads within a specific campaign with 7-day performance.",
  inputSchema: {
    type: "object",
    properties: { campaignId: { type: "string" } },
    required: ["campaignId"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `List ads for campaign ${i.campaignId}`,
  execute: async (i) => ({ ads: await ads.listAds(i.campaignId) }),
};

export const listSearchTermsTool: AgentTool<{ campaignId: string }> = {
  name: "ads_list_search_terms",
  description:
    "List the actual search terms users typed that triggered ads in a campaign, with spend and conversions.",
  inputSchema: {
    type: "object",
    properties: { campaignId: { type: "string" } },
    required: ["campaignId"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `List search terms for campaign ${i.campaignId}`,
  execute: async (i) => ({ terms: await ads.listSearchTerms(i.campaignId) }),
};

// ─────────────────────────────────────────────────────────────────
// WRITE tools — authority depends on impact
// ─────────────────────────────────────────────────────────────────

export const pauseAdTool: AgentTool<{ adId: string; reason: string }> = {
  name: "ads_pause_ad",
  description:
    "Pause a specific ad. Use for ads with significant spend and zero conversions, or clearly underperforming creative.",
  inputSchema: {
    type: "object",
    properties: {
      adId: { type: "string" },
      reason: { type: "string", description: "Why this ad should be paused" },
    },
    required: ["adId", "reason"],
  },
  defaultAuthority: "auto", // auto-pause is fine — easy to undo
  describeAction: (i) => `Pause ad ${i.adId} (${i.reason})`,
  estimateImpact: async (i, ctx) => {
    // Find the ad to estimate weekly savings
    const all = await ads.listCampaigns();
    for (const c of all) {
      const adsInC = await ads.listAds(c.id);
      const a = adsInC.find((x) => x.adId === i.adId);
      if (a) return `~$${a.spend7dUsd.toFixed(0)}/wk saved`;
    }
    return "unknown";
  },
  execute: async (i) => ads.pauseAd(i.adId),
};

export const setBudgetTool: AgentTool<{
  campaignId: string;
  newDailyUsd: number;
  reason: string;
}> = {
  name: "ads_set_campaign_budget",
  description:
    "Change a campaign's daily budget. Small adjustments are auto-executed; larger changes need approval; very large increases escalate.",
  inputSchema: {
    type: "object",
    properties: {
      campaignId: { type: "string" },
      newDailyUsd: { type: "number" },
      reason: { type: "string" },
    },
    required: ["campaignId", "newDailyUsd", "reason"],
  },
  defaultAuthority: "approve",
  resolveAuthority: async (i) => {
    const all = await ads.listCampaigns();
    const c = all.find((x) => x.id === i.campaignId);
    if (!c) return "approve";
    const pctChange = Math.abs(i.newDailyUsd - c.dailyBudgetUsd) / c.dailyBudgetUsd;
    if (pctChange * 100 <= cmoConfig.budgetChangeAutoMaxPct) return "auto";
    if (pctChange * 100 <= cmoConfig.budgetChangeApproveMaxPct) return "approve";
    return "escalate";
  },
  describeAction: (i) =>
    `Set campaign ${i.campaignId} daily budget to $${i.newDailyUsd} (${i.reason})`,
  estimateImpact: async (i) => {
    const all = await ads.listCampaigns();
    const c = all.find((x) => x.id === i.campaignId);
    if (!c) return "unknown";
    const delta = i.newDailyUsd - c.dailyBudgetUsd;
    return `${delta >= 0 ? "+" : ""}$${(delta * 30).toFixed(0)}/mo spend change`;
  },
  execute: async (i) => {
    const all = await ads.listCampaigns();
    const campaign = all.find((x) => x.id === i.campaignId);
    const dailyDelta = campaign ? i.newDailyUsd - campaign.dailyBudgetUsd : 0;
    const result = await ads.setCampaignBudget(i.campaignId, i.newDailyUsd);
    // Only track real ad-spend changes in the budget — skip when running on mock data
    if (result.mock) return { ...result };
    return { ...result, weekly_delta_usd: dailyDelta * 7 };
  },
};

export const addNegativeKeywordTool: AgentTool<{
  campaignId: string;
  keyword: string;
  matchType: "EXACT" | "PHRASE" | "BROAD";
  reason: string;
}> = {
  name: "ads_add_negative_keyword",
  description:
    "Add a negative keyword to a campaign to stop wasting spend on irrelevant searches. Auto-executed when search term has significant spend with no conversions.",
  inputSchema: {
    type: "object",
    properties: {
      campaignId: { type: "string" },
      keyword: { type: "string" },
      matchType: { type: "string", enum: ["EXACT", "PHRASE", "BROAD"] },
      reason: { type: "string" },
    },
    required: ["campaignId", "keyword", "matchType", "reason"],
  },
  defaultAuthority: "auto",
  describeAction: (i) =>
    `Add negative keyword "${i.keyword}" (${i.matchType}) to campaign ${i.campaignId}`,
  estimateImpact: async (i) => {
    const terms = await ads.listSearchTerms(i.campaignId);
    const match = terms.find((t) =>
      t.text.toLowerCase().includes(i.keyword.toLowerCase())
    );
    return match ? `~$${(match.spendUsd * 4).toFixed(0)}/mo saved` : "modest savings";
  },
  execute: async (i) => ads.addNegativeKeyword(i.campaignId, i.keyword, i.matchType),
};

export const createAdTool: AgentTool<{
  campaignId: string;
  adGroupId: string;
  headlines: string[];
  descriptions: string[];
  finalUrls: string[];
  rationale: string;
}> = {
  name: "ads_create_responsive_search_ad",
  description:
    "Draft a new Responsive Search Ad with headlines and descriptions. Always queues for your approval before going live.",
  inputSchema: {
    type: "object",
    properties: {
      campaignId: { type: "string" },
      adGroupId: { type: "string" },
      headlines: {
        type: "array",
        items: { type: "string" },
        description: "3-15 headlines, each ≤30 chars",
      },
      descriptions: {
        type: "array",
        items: { type: "string" },
        description: "2-4 descriptions, each ≤90 chars",
      },
      finalUrls: { type: "array", items: { type: "string" } },
      rationale: {
        type: "string",
        description: "Why this ad will perform — reference data from previous tool calls",
      },
    },
    required: ["campaignId", "adGroupId", "headlines", "descriptions", "finalUrls", "rationale"],
  },
  defaultAuthority: "approve", // creative always needs human eyes
  describeAction: (i) =>
    `New ad in adgroup ${i.adGroupId}: "${i.headlines.slice(0, 2).join(" | ")}..."`,
  estimateImpact: () => "TBD — depends on CTR/CVR vs current ads",
  execute: async (i) => {
    const result = await ads.createResponsiveSearchAd(
      i.campaignId,
      i.adGroupId,
      i.headlines,
      i.descriptions,
      i.finalUrls,
    );
    // Mirror ad creation into build_queue with category='marketing'.
    // Marketing category never auto-ships — Chris approves in the dashboard.
    try {
      const { proposeToQueue } = await import("@/agent-tools/pipeline/propose");
      await proposeToQueue({
        title: `Google Ads: ${i.headlines[0] ?? "(no headline)"}`,
        description: i.rationale +
          "\n\n**Headlines:**\n- " + i.headlines.join("\n- ") +
          "\n\n**Descriptions:**\n- " + i.descriptions.join("\n- "),
        sourceAgent: "cmo",
        category: "marketing",
        priority: "medium",
        rationale: `Responsive Search Ad draft in adgroup ${i.adGroupId}`,
      });
    } catch (e) {
      console.error("[ads_create] build_queue mirror failed:", e);
    }
    return result;
  },
};

export const allAdsTools = [
  listCampaignsTool,
  listAdsTool,
  listSearchTermsTool,
  pauseAdTool,
  setBudgetTool,
  addNegativeKeywordTool,
  createAdTool,
];
