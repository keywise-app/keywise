// lib/agent-tools/search-console/client.ts
// Authenticated Google Search Console API client.
// Reads credentials from env vars, caches auth at module scope.

import { google, searchconsole_v1 } from "googleapis";

let cachedClient: searchconsole_v1.Searchconsole | null = null;

function getClient(): searchconsole_v1.Searchconsole {
  if (cachedClient) return cachedClient;

  const clientId = process.env.GOOGLE_SC_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SC_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_SC_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google SC env vars: GOOGLE_SC_CLIENT_ID, GOOGLE_SC_CLIENT_SECRET, GOOGLE_SC_REFRESH_TOKEN"
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });

  cachedClient = google.searchconsole({ version: "v1", auth: oauth2 });
  return cachedClient;
}

export function getSiteUrl(): string {
  return process.env.GOOGLE_SC_SITE_URL || "https://keywise.app/";
}

function dateStr(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86400_000);
  return d.toISOString().slice(0, 10);
}

export interface SCQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SCPageRow {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// None of the fetch* functions in this file swallow errors into a fake
// empty result anymore -- an empty array from a failed API call is
// indistinguishable from "Search Console genuinely has nothing to report,"
// and that ambiguity is exactly what let a dead OAuth token pass as
// legitimate "zero data" for months (see fetchRanksForKeywords and the
// rank_snapshots cleanup). Callers must handle the rejection themselves:
// AgentTool.execute() callers get this for free (the runner already
// catches tool errors and reports them to the agent); direct callers
// building a prompt() string need their own try/catch so a Search
// Console outage degrades that one prompt instead of crashing the task.
export async function fetchTopQueries(days: number): Promise<SCQueryRow[]> {
  const sc = getClient();
  const res = await sc.searchanalytics.query({
    siteUrl: getSiteUrl(),
    requestBody: {
      startDate: dateStr(days),
      endDate: dateStr(0),
      dimensions: ["query"],
      rowLimit: 25,
    },
  });
  return (res.data.rows || []).map((r) => ({
    query: r.keys![0],
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: Math.round((r.ctr ?? 0) * 1000) / 1000,
    position: Math.round((r.position ?? 0) * 10) / 10,
  }));
}

export async function fetchTopPages(days: number): Promise<SCPageRow[]> {
  const sc = getClient();
  const res = await sc.searchanalytics.query({
    siteUrl: getSiteUrl(),
    requestBody: {
      startDate: dateStr(days),
      endDate: dateStr(0),
      dimensions: ["page"],
      rowLimit: 25,
    },
  });
  return (res.data.rows || []).map((r) => ({
    url: r.keys![0],
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: Math.round((r.ctr ?? 0) * 1000) / 1000,
    position: Math.round((r.position ?? 0) * 10) / 10,
  }));
}

export async function fetchOpportunityKeywords(): Promise<SCQueryRow[]> {
  const sc = getClient();
  const res = await sc.searchanalytics.query({
    siteUrl: getSiteUrl(),
    requestBody: {
      startDate: dateStr(28),
      endDate: dateStr(0),
      dimensions: ["query"],
      rowLimit: 100,
    },
  });
  return (res.data.rows || [])
    .map((r) => ({
      query: r.keys![0],
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: Math.round((r.ctr ?? 0) * 1000) / 1000,
      position: Math.round((r.position ?? 0) * 10) / 10,
    }))
    .filter((q) => q.position >= 8 && q.position <= 20 && q.impressions >= 100);
}

// Unlike the other fetch* helpers in this file, this one does NOT swallow
// errors into a fake empty/zero result. A caller storing this as a daily
// rank snapshot can't tell "Google says zero impressions" apart from
// "the API call itself failed" if both look like the same all-null row --
// that's exactly what happened here for months (invalid_grant on every
// call, silently recorded as "not ranked" for every keyword, every day).
// Let it throw; callers must decide how to record a failed fetch.
export async function fetchRanksForKeywords(
  keywords: string[]
): Promise<{ keyword: string; position: number | null; impressions: number; clicks: number; ctr: number; url: string | null }[]> {
  const sc = getClient();
  const res = await sc.searchanalytics.query({
    siteUrl: getSiteUrl(),
    requestBody: {
      startDate: dateStr(3),
      endDate: dateStr(0),
      dimensions: ["query", "page"],
      rowLimit: 500,
    },
  });

  const rows = res.data.rows || [];
  // Build a map: query → best (lowest position) row
  const best = new Map<string, { position: number; impressions: number; clicks: number; ctr: number; url: string }>();
  for (const r of rows) {
    const q = r.keys![0].toLowerCase();
    const pos = r.position ?? 100;
    const existing = best.get(q);
    if (!existing || pos < existing.position) {
      best.set(q, {
        position: Math.round(pos * 10) / 10,
        impressions: r.impressions ?? 0,
        clicks: r.clicks ?? 0,
        ctr: Math.round((r.ctr ?? 0) * 1000) / 1000,
        url: r.keys![1],
      });
    }
  }

  return keywords.map((kw) => {
    const match = best.get(kw.toLowerCase());
    return {
      keyword: kw,
      position: match?.position ?? null,
      impressions: match?.impressions ?? 0,
      clicks: match?.clicks ?? 0,
      ctr: match?.ctr ?? 0,
      url: match?.url ?? null,
    };
  });
}
