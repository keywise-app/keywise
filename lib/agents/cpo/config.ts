// src/agents/cpo/config.ts
// Tune these to control how the CPO classifies and routes product proposals.
// The CPO never ships product changes directly — it writes proposals to the
// product_proposals table for Chris to approve. The thresholds below decide
// which proposals route to "approve" (normal review) vs "escalate" (don't ship
// until Chris explicitly green-lights, e.g. breaking changes to billing/auth).

export const cpoConfig = {
  // Default authority for product_propose: every product change goes to Chris.
  defaultProposalAuthority: "approve" as const,

  // If a proposal title or description mentions any of these, escalate instead.
  // These are areas where shipping the wrong fix breaks production for real users.
  breakingChangeKeywords: [
    "auth",
    "login",
    "signup-flow", // not "signup" — that's a legitimate audit target
    "billing",
    "stripe",
    "payment",
    "rls",
    "policy",
    "migration",
    "schema change",
    "rate limit",
    "rename route",
    "remove route",
    "delete user",
    "deprecate",
    "breaking",
  ],

  // Competitors the CPO benchmarks UX against. Keep the list short — these are
  // the two with overlapping ICP. Not Buildium's enterprise tier.
  competitors: ["rentredi", "buildium"] as const,

  // Max proposals to write per task run. Keeps Chris's review queue sane.
  maxProposalsPerRun: 5,

  // Auto-merge threshold. Proposals at or below this severity auto-merge after
  // the preview screenshot is captured. Set to null to require manual Merge clicks
  // for every PR.
  //
  // Was "medium" from launch through 2026-08-22 — 5 PRs auto-merged to main
  // during that window (see proposal_implementations, status='shipped', merged_at
  // populated) with no human review. Flipped to null because the threshold's own
  // stated rule ("flip to null on day one of having a paying customer") was never
  // satisfied — there has never been a paying customer. Don't raise this above
  // null without a deliberate decision to accept unreviewed merges to main again.
  //
  //   "low"    → only low auto-merges
  //   "medium" → low + medium auto-merge
  //   "high"   → everything except critical auto-merges (aggressive)
  //   null     → nothing auto-merges
  autoMergeBelowSeverity: null as "low" | "medium" | "high" | null,
};

/** Returns true if a proposal's severity is eligible for auto-merge today. */
export function isAutoMergeEligible(
  severity: "critical" | "high" | "medium" | "low"
): boolean {
  const threshold = cpoConfig.autoMergeBelowSeverity;
  if (!threshold) return false;
  if (severity === "critical") return false;
  // Order: low < medium < high < critical
  const order = { low: 0, medium: 1, high: 2, critical: 3 };
  return order[severity] <= order[threshold];
}

export type Competitor = (typeof cpoConfig.competitors)[number];
