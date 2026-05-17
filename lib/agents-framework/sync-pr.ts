// lib/agents-framework/sync-pr.ts
// Polls GitHub for an in-flight implementation's current PR state and updates
// the proposal_implementations row. Self-heals the dashboard when the
// screenshot/auto-merge pipeline drops a beat (Vercel killing fire-and-forget,
// puppeteer OOM, network blip, etc.) but the PR itself moved on GitHub.

import { devConfig } from "@/agents/dev/config";

interface PrState {
  state: "open" | "closed";
  merged: boolean;
  merged_at: string | null;
  merge_commit_sha: string | null;
  html_url: string;
}

async function fetchPr(prNumber: number): Promise<PrState | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${devConfig.owner}/${devConfig.repo}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "keywise-sync",
        },
        // Keep the page render snappy — fail fast if GitHub is slow
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      state: data.state,
      merged: !!data.merged,
      merged_at: data.merged_at,
      merge_commit_sha: data.merge_commit_sha,
      html_url: data.html_url,
    };
  } catch {
    return null;
  }
}

/**
 * Sync ONE implementation's status from GitHub. Returns the updated status if
 * we changed anything, or null if no change.
 */
export async function syncImplementation(
  supabase: any,
  implementationId: string
): Promise<string | null> {
  const { data: impl } = await supabase
    .from("proposal_implementations")
    .select("id, status, pr_number, merged_at, shipped_at")
    .eq("id", implementationId)
    .maybeSingle();
  if (!impl || !impl.pr_number) return null;

  // Only sync rows that could still change: pr_open, preview_ready, auto_merging, merged.
  // shipped/reverted/agent_failed/failed are terminal.
  const inFlight = [
    "pr_open",
    "preview_ready",
    "auto_merging",
    "merged",
  ];
  if (!inFlight.includes(impl.status)) return null;

  const pr = await fetchPr(impl.pr_number);
  if (!pr) return null;

  const updates: Record<string, any> = {};

  if (pr.merged && !impl.merged_at) {
    updates.merged_at = pr.merged_at;
  }

  // PR is merged but our row hasn't caught up to 'merged' or 'shipped' yet.
  // We promote to 'shipped' directly because once merged on main, Vercel
  // auto-deploys and the change is live within ~2 min. (If you want to be
  // strict about "shipped" meaning the prod screenshot succeeded, change this
  // to 'merged' instead — but for the dashboard's purpose of "did this ship",
  // 'shipped' is the right truth once the PR is merged.)
  if (pr.merged && impl.status !== "shipped") {
    updates.status = "shipped";
    if (!impl.shipped_at) updates.shipped_at = new Date().toISOString();
  }

  // PR was closed without merging — implementation failed.
  if (!pr.merged && pr.state === "closed" && impl.status !== "agent_failed") {
    updates.status = "failed";
    updates.error =
      (impl as any).error ??
      "PR was closed on GitHub without merging. Reopen the PR or reject this implementation.";
  }

  if (Object.keys(updates).length === 0) return null;

  await supabase
    .from("proposal_implementations")
    .update(updates)
    .eq("id", implementationId);

  // Also bump the related proposal's status when we ship
  if (updates.status === "shipped") {
    const { data: implRow } = await supabase
      .from("proposal_implementations")
      .select("proposal_id")
      .eq("id", implementationId)
      .maybeSingle();
    if (implRow?.proposal_id) {
      await supabase
        .from("product_proposals")
        .update({ status: "shipped" })
        .eq("id", implRow.proposal_id);
    }
  }

  return updates.status ?? null;
}

/**
 * Bulk-sync all in-flight implementations. Returns count of rows changed.
 * Used by the proposals dashboard to refresh on every load.
 */
export async function syncAllInFlight(supabase: any): Promise<number> {
  const { data: rows } = await supabase
    .from("proposal_implementations")
    .select("id")
    .in("status", ["pr_open", "preview_ready", "auto_merging", "merged"]);
  if (!rows?.length) return 0;

  const results = await Promise.allSettled(
    (rows as { id: string }[]).map((r) => syncImplementation(supabase, r.id))
  );
  return results.filter(
    (r) => r.status === "fulfilled" && r.value !== null
  ).length;
}
