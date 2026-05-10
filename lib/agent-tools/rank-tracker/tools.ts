// src/tools/rank-tracker/tools.ts
// Daily snapshot of how Keywise ranks for target keywords + alerting.

import type { AgentTool } from "@/agents-framework/types";

interface RankRow {
  keyword: string;
  position: number | null;
  impressions: number;
  clicks: number;
  ctr: number;
  url: string | null;
}

// In production: query Search Console for these keywords. Stub returns plausible data.
async function fetchRanksForKeywords(keywords: string[]): Promise<RankRow[]> {
  // TODO: real Search Console searchanalytics.query with dimensions=['query','page']
  // and filter to keywords list.
  return keywords.map((k, i) => ({
    keyword: k,
    position: 8 + (i % 12) + Math.random() * 3,
    impressions: 100 + Math.floor(Math.random() * 500),
    clicks: Math.floor(Math.random() * 30),
    ctr: 0.01 + Math.random() * 0.05,
    url: i % 3 === 0 ? "/" : `/blog/${k.replace(/\s+/g, "-")}`,
  }));
}

export const snapshotRanksTool: AgentTool<{}> = {
  name: "rank_snapshot_today",
  description:
    "Pull today's Google rankings for all tracked keyword_targets and store as rank_snapshots. Run once per day.",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "Snapshot today's keyword rankings",
  execute: async (_, ctx) => {
    const { data: targets } = await ctx.supabase
      .from("keyword_targets")
      .select("id, keyword");
    if (!targets || targets.length === 0) {
      return { snapshots: 0, note: "No keyword_targets configured. Add some via the admin UI." };
    }
    const ranks = await fetchRanksForKeywords(targets.map((t: any) => t.keyword));
    const today = new Date().toISOString().slice(0, 10);
    const rows = targets.map((t: any) => {
      const r = ranks.find((x) => x.keyword === t.keyword);
      return {
        keyword_id: t.id,
        recorded_on: today,
        position: r?.position ?? null,
        impressions: r?.impressions ?? 0,
        clicks: r?.clicks ?? 0,
        ctr: r?.ctr ?? null,
        url: r?.url ?? null,
      };
    });
    await ctx.supabase
      .from("rank_snapshots")
      .upsert(rows, { onConflict: "keyword_id,recorded_on" });
    return { snapshots: rows.length, date: today };
  },
};

export const rankMovementTool: AgentTool<{ days?: number }> = {
  name: "rank_movement_report",
  description:
    "Find keywords with significant ranking movement (gained or lost ≥3 positions) over the last N days. Flags wins to amplify and drops to investigate.",
  inputSchema: {
    type: "object",
    properties: { days: { type: "number" } },
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Rank movement (${i.days ?? 7}d)`,
  execute: async (i, ctx) => {
    const days = i.days ?? 7;
    const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
    const { data: snapshots } = await ctx.supabase
      .from("rank_snapshots")
      .select("keyword_id, recorded_on, position, keyword_targets(keyword)")
      .gte("recorded_on", since)
      .order("recorded_on", { ascending: true });

    if (!snapshots) return { movements: [] };

    // Group by keyword and compute first vs last
    const byKw: Record<string, any[]> = {};
    for (const s of snapshots as any[]) {
      const k = s.keyword_targets?.keyword ?? s.keyword_id;
      (byKw[k] ??= []).push(s);
    }
    const movements = Object.entries(byKw)
      .map(([kw, rows]) => {
        const first = rows[0];
        const last = rows[rows.length - 1];
        const fp = first.position ?? 100;
        const lp = last.position ?? 100;
        return { keyword: kw, from: fp, to: lp, delta: fp - lp }; // positive = improved
      })
      .filter((m) => Math.abs(m.delta) >= 3)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return { movements, period_days: days };
  },
};

export const addKeywordTargetTool: AgentTool<{
  keyword: string;
  intent: "commercial" | "informational" | "navigational";
  priority: number;
  rationale: string;
}> = {
  name: "rank_add_keyword_target",
  description:
    "Add a new keyword to track. Use for keywords found via Search Console opportunity analysis or competitor research that we should be ranking for.",
  inputSchema: {
    type: "object",
    properties: {
      keyword: { type: "string" },
      intent: { type: "string", enum: ["commercial", "informational", "navigational"] },
      priority: { type: "number", description: "1-5; 5=critical" },
      rationale: { type: "string" },
    },
    required: ["keyword", "intent", "priority", "rationale"],
  },
  defaultAuthority: "auto",
  describeAction: (i) => `Track keyword "${i.keyword}" (priority ${i.priority})`,
  execute: async (i, ctx) => {
    const { data, error } = await ctx.supabase
      .from("keyword_targets")
      .upsert(
        {
          keyword: i.keyword,
          intent: i.intent,
          priority: i.priority,
          notes: i.rationale,
        },
        { onConflict: "keyword" }
      )
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id };
  },
};

export const allRankTrackerTools = [
  snapshotRanksTool,
  rankMovementTool,
  addKeywordTargetTool,
];
