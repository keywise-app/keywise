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

  // The 10 user-facing flows the CPO cycles through in daily_flow_audit.
  // Day-of-year mod 10 picks the day's flow — predictable rotation.
  auditFlows: [
    "signup",
    "add_property",
    "add_tenant",
    "send_lease",
    "set_up_auto_pay",
    "fmv_calculation",
    "rent_renewal",
    "maintenance_request",
    "document_signing",
    "expense_logging",
  ] as const,

  // Competitors the CPO benchmarks UX against. Keep the list short — these are
  // the two with overlapping ICP. Not Buildium's enterprise tier.
  competitors: ["rentredi", "buildium"] as const,

  // Max proposals to write per task run. Keeps Chris's review queue sane.
  maxProposalsPerRun: 5,
};

export type AuditFlow = (typeof cpoConfig.auditFlows)[number];
export type Competitor = (typeof cpoConfig.competitors)[number];
