// lib/agent-tools/rank-tracker/tools.ts
// Daily snapshot of how Keywise ranks for target keywords + alerting.
// Designed for new domains with thin data — avoids false alarms.

import type { AgentTool } from "@/agents-framework/types";
import { fetchRanksForKeywords } from "@/agent-tools/search-console/client";

function dataQuality(impressions: number): "reliable" | "thin" | "none" {
  if (impressions >= 5) return "reliable";
  if (impressions >= 1) return "thin";
  return "none";
}

export const snapshotRanksTool: AgentTool<{}> = {
  name: "rank_snapshot_today",
  description:
    "Pull today's Google rankings for all tracked keyword_targets and store as rank_snapshots. Run once per day. Returns data_quality per keyword: 'reliable' (≥5 impressions), 'thin' (1-4), or 'none' (0). Only 'reliable' data should be used for trend analysis.",
  inputSchema: { type: "object", properties: {} },
  defaultAuthority: "auto",
  describeAction: () => "Snapshot today's keyword rankings",
  execute: async (_, ctx) => {
    const { data: targets } = await ctx.supabase
      .from("keyword_targets")
      .select("id, keyword");
    if (!targets || targets.length === 0) {
      return { snapshots: 0, note: "No keyword_targets configured." };
    }
    const ranks = await fetchRanksForKeywords(targets.map((t: any) => t.keyword));
    const today = new Date().toISOString().slice(0, 10);

    let reliableCount = 0;
    let thinCount = 0;
    let noneCount = 0;

    const rows = targets.map((t: any) => {
      const r = ranks.find((x) => x.keyword === t.keyword);
      const imp = r?.impressions ?? 0;
      const dq = dataQuality(imp);
      if (dq === "reliable") reliableCount++;
      else if (dq === "thin") thinCount++;
      else noneCount++;

      return {
        keyword_id: t.id,
        recorded_on: today,
        // Only store position if data is meaningful; null = not enough data
        position: imp >= 5 ? (r?.position ?? null) : null,
        impressions: imp,
        clicks: r?.clicks ?? 0,
        ctr: r?.ctr ?? null,
        url: r?.url ?? null,
      };
    });
    await ctx.supabase
      .from("rank_snapshots")
      .upsert(rows, { onConflict: "keyword_id,recorded_on" });

    return {
      snapshots: rows.length,
      date: today,
      data_quality_summary: {
        reliable: reliableCount,
        thin: thinCount,
        none: noneCount,
        note: noneCount > reliableCount
          ? "Most keywords have insufficient impression data this period. This is normal for a new domain — don't interpret missing data as ranking drops."
          : undefined,
      },
    };
  },
};

export const rankMovementTool: AgentTool<{ days?: number }> = {
  name: "rank_movement_report",
  description:
    "Find keywords with significant, RELIABLE ranking movement over the last N days. Only reports movements where BOTH the before and after snapshots have ≥5 impressions (reliable data). Keywords that lost impressions entirely are reported separately as 'data_loss' — not as ranking drops.",
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
      .select("keyword_id, recorded_on, position, impressions, keyword_targets(keyword)")
      .gte("recorded_on", since)
      .order("recorded_on", { ascending: true });

    if (!snapshots) return { reliable_movements: [], data_loss: [], insufficient_data: [] };

    // Group by keyword
    const byKw: Record<string, any[]> = {};
    for (const s of snapshots as any[]) {
      const k = s.keyword_targets?.keyword ?? s.keyword_id;
      (byKw[k] ??= []).push(s);
    }

    const reliableMovements: any[] = [];
    const dataLoss: any[] = [];
    const insufficientData: string[] = [];

    for (const [kw, rows] of Object.entries(byKw)) {
      const first = rows[0];
      const last = rows[rows.length - 1];
      const firstImp = first.impressions ?? 0;
      const lastImp = last.impressions ?? 0;
      const firstReliable = firstImp >= 5;
      const lastReliable = lastImp >= 5;

      if (!firstReliable && !lastReliable) {
        // Neither end has reliable data — skip entirely
        insufficientData.push(kw);
        continue;
      }

      if (firstReliable && !lastReliable) {
        // Had data, now doesn't — data loss, NOT a ranking drop
        dataLoss.push({
          keyword: kw,
          previous_position: first.position,
          previous_impressions: firstImp,
          current_impressions: lastImp,
          reliability: "data_loss",
          note: "Keyword had impressions before but not recently. Could be seasonal, could be data lag. Not necessarily a ranking drop.",
        });
        continue;
      }

      // Both sides have data — compute real movement
      const fp = first.position ?? 100;
      const lp = last.position ?? 100;
      const delta = fp - lp; // positive = improved

      // Only report if both are in top 50 range AND delta is meaningful
      if (Math.abs(delta) >= 3 && (fp <= 50 || lp <= 50)) {
        reliableMovements.push({
          keyword: kw,
          from: Math.round(fp * 10) / 10,
          to: Math.round(lp * 10) / 10,
          delta: Math.round(delta * 10) / 10,
          reliability: "reliable",
        });
      }
    }

    reliableMovements.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return {
      reliable_movements: reliableMovements,
      data_loss: dataLoss,
      insufficient_data: insufficientData,
      period_days: days,
      note: insufficientData.length > 0
        ? `${insufficientData.length} keywords skipped due to insufficient impression data (< 5 on both ends). This is expected for a new domain.`
        : undefined,
    };
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
