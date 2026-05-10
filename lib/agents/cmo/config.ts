// src/agents/cmo/config.ts
// Tune these to control how aggressive the CMO is.
// Defaults match "Aggressive — auto-execute most things under a $ threshold"

export const cmoConfig = {
  // Auto-pause an ad if it has spent at least this much with zero conversions
  pauseDeadAdSpendThreshold: 50, // USD

  // Auto-adjust bids within ±this percent
  bidAdjustmentMaxPct: 15,

  // Auto-execute budget changes up to this % of current daily budget
  budgetChangeAutoMaxPct: 10,

  // Approve required for budget changes between auto and escalate
  budgetChangeApproveMaxPct: 25,
  // Anything > 25% increase escalates

  // Auto-add negative keywords if a search term has spend with no conv
  negativeKeywordSpendThreshold: 25, // USD per search term

  // New ad copy: always 'approve' (you wanted draft + notify on creative)
  // New campaigns: always 'escalate'
  // Blog posts: auto to staging, approve for prod publish

  // Daily safety cap — stop the CMO if it tries to change more than $X/day in spend
  dailySpendChangeCapUsd: 200,
};
