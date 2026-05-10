// src/tools/google-ads/client.ts
// Thin wrapper around google-ads-api npm package. Stubbed where it would
// hit Google's API so this file compiles before you wire OAuth.
//
// To go live:
//   npm install google-ads-api
//   Set env: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
//            GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_REFRESH_TOKEN,
//            GOOGLE_ADS_CUSTOMER_ID
//   Then replace the bodies below.

export interface AdsCampaign {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  dailyBudgetUsd: number;
  spend7dUsd: number;
  conversions7d: number;
  clicks7d: number;
  impressions7d: number;
  ctr: number;
  costPerConversion: number | null;
}

export interface AdGroupAd {
  campaignId: string;
  adGroupId: string;
  adId: string;
  headlines: string[];
  descriptions: string[];
  status: "ENABLED" | "PAUSED";
  spend7dUsd: number;
  conversions7d: number;
  clicks7d: number;
}

export interface SearchTerm {
  campaignId: string;
  text: string;
  spendUsd: number;
  conversions: number;
  clicks: number;
}

// ─────────────────────────────────────────────────────────────────
// READ operations
// ─────────────────────────────────────────────────────────────────

export async function listCampaigns(): Promise<AdsCampaign[]> {
  // TODO replace with google-ads-api customer.report({...}) call
  return MOCK_CAMPAIGNS;
}

export async function listAds(campaignId: string): Promise<AdGroupAd[]> {
  return MOCK_ADS.filter((a) => a.campaignId === campaignId);
}

export async function listSearchTerms(
  campaignId: string,
  days = 7
): Promise<SearchTerm[]> {
  return MOCK_SEARCH_TERMS.filter((t) => t.campaignId === campaignId);
}

// ─────────────────────────────────────────────────────────────────
// WRITE operations (called by tools that pass authority check)
// ─────────────────────────────────────────────────────────────────

export async function pauseAd(adId: string): Promise<{ ok: true }> {
  // TODO real call: customer.adGroupAds.update([{resource_name, status:'PAUSED'}])
  console.log(`[google-ads] would pause ad ${adId}`);
  return { ok: true };
}

export async function setCampaignBudget(
  campaignId: string,
  newDailyUsd: number
): Promise<{ ok: true }> {
  console.log(`[google-ads] would set campaign ${campaignId} budget to $${newDailyUsd}/day`);
  return { ok: true };
}

export async function addNegativeKeyword(
  campaignId: string,
  keyword: string,
  matchType: "EXACT" | "PHRASE" | "BROAD"
): Promise<{ ok: true }> {
  console.log(`[google-ads] would add neg keyword "${keyword}" (${matchType}) to ${campaignId}`);
  return { ok: true };
}

export async function createResponsiveSearchAd(
  campaignId: string,
  adGroupId: string,
  headlines: string[],
  descriptions: string[],
  finalUrls: string[]
): Promise<{ ok: true; adId: string }> {
  console.log(`[google-ads] would create RSA in ${adGroupId}`);
  return { ok: true, adId: `mock-${Date.now()}` };
}

// ─────────────────────────────────────────────────────────────────
// Mock data so the framework runs end-to-end before OAuth is wired
// ─────────────────────────────────────────────────────────────────

const MOCK_CAMPAIGNS: AdsCampaign[] = [
  {
    id: "1001",
    name: "Search - Property Management Software",
    status: "ENABLED",
    dailyBudgetUsd: 30,
    spend7dUsd: 198.4,
    conversions7d: 4,
    clicks7d: 87,
    impressions7d: 3210,
    ctr: 0.027,
    costPerConversion: 49.6,
  },
  {
    id: "1002",
    name: "Search - Landlord App",
    status: "ENABLED",
    dailyBudgetUsd: 20,
    spend7dUsd: 132.0,
    conversions7d: 0,
    clicks7d: 41,
    impressions7d: 1804,
    ctr: 0.023,
    costPerConversion: null,
  },
];

const MOCK_ADS: AdGroupAd[] = [
  {
    campaignId: "1002",
    adGroupId: "5001",
    adId: "ad-9001",
    headlines: ["Best Landlord App", "Manage Rentals Easy", "Try Free"],
    descriptions: ["AI-powered property management for independent landlords."],
    status: "ENABLED",
    spend7dUsd: 78.2,
    conversions7d: 0,
    clicks7d: 24,
  },
];

const MOCK_SEARCH_TERMS: SearchTerm[] = [
  { campaignId: "1002", text: "free property management excel", spendUsd: 31.4, conversions: 0, clicks: 12 },
  { campaignId: "1001", text: "keywise app", spendUsd: 4.2, conversions: 2, clicks: 6 },
];
