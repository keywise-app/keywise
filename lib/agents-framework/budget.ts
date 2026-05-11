// lib/agents-framework/budget.ts — weekly spend tracking across all agent cost sources

// TODO: revert to 20 on Monday (2026-05-12)
export const WEEKLY_BUDGET_USD = 40;

export interface BudgetStatus {
  weekStart: string;   // ISO date, Monday 00:00 UTC
  weekEnd: string;     // ISO date, Sunday 23:59 UTC
  anthropicSpend: number;
  twitterSpend: number;
  adIncreaseSpend: number;
  total: number;
  cap: number;
  remaining: number;
  capHit: boolean;
  pctUsed: number;
}

/** Get the Monday 00:00 UTC that starts the current week */
function currentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday;
}

function weekEnd(start: Date): Date {
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
}

export async function getBudgetStatus(supabase: any): Promise<BudgetStatus> {
  const start = currentWeekStart();
  const end = weekEnd(start);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  // 1. Anthropic API cost — sum cost_usd from agent_runs this week
  const { data: runs } = await supabase
    .from("agent_runs")
    .select("cost_usd")
    .gte("started_at", startStr)
    .lte("started_at", endStr);

  const anthropicSpend = (runs || []).reduce(
    (s: number, r: any) => s + (Number(r.cost_usd) || 0),
    0
  );

  // 2. Twitter/X cost — $0.015 per text post, $0.20 per URL post
  const { data: tweets } = await supabase
    .from("social_posts")
    .select("link_url")
    .eq("platform", "twitter")
    .eq("status", "posted")
    .gte("posted_at", startStr)
    .lte("posted_at", endStr);

  const twitterSpend = (tweets || []).reduce(
    (s: number, t: any) => s + (t.link_url ? 0.20 : 0.015),
    0
  );

  // 3. Net ad-spend increases — sum positive weekly_delta_usd from budget actions
  const { data: budgetActions } = await supabase
    .from("agent_actions")
    .select("result")
    .eq("tool", "ads_set_campaign_budget")
    .eq("status", "executed")
    .gte("created_at", startStr)
    .lte("created_at", endStr);

  const adIncreaseSpend = (budgetActions || []).reduce((s: number, a: any) => {
    const delta = Number(a.result?.weekly_delta_usd) || 0;
    return s + (delta > 0 ? delta : 0); // only count increases
  }, 0);

  const total = Math.round((anthropicSpend + twitterSpend + adIncreaseSpend) * 100) / 100;
  const remaining = Math.max(0, Math.round((WEEKLY_BUDGET_USD - total) * 100) / 100);

  return {
    weekStart: start.toISOString().split("T")[0],
    weekEnd: end.toISOString().split("T")[0],
    anthropicSpend: Math.round(anthropicSpend * 100) / 100,
    twitterSpend: Math.round(twitterSpend * 1000) / 1000,
    adIncreaseSpend: Math.round(adIncreaseSpend * 100) / 100,
    total,
    cap: WEEKLY_BUDGET_USD,
    remaining,
    capHit: total >= WEEKLY_BUDGET_USD,
    pctUsed: Math.min(100, Math.round((total / WEEKLY_BUDGET_USD) * 1000) / 10),
  };
}
