// src/agents/dev/config.ts
// The Dev agent reads product_proposals, writes diffs, opens PRs.
// These guardrails control what it's allowed to touch.

export const devConfig = {
  // GitHub repo
  owner: "keywise-app",
  repo: "keywise",
  baseBranch: "main",

  // The agent will REFUSE to write to any path matching these patterns.
  // It will set status='agent_failed' with a reason instead of opening a PR.
  // These exist because the wrong change here is a real production incident
  // (auth break, RLS leak, billing miswire, schema drift).
  doNotModify: [
    /^supabase\/migrations\//,        // schema changes — human review only
    /^lib\/agents\//,                 // agent must not rewrite itself
    /^lib\/agent-tools\//,            // agent must not rewrite its own tools
    /^lib\/agents-framework\//,       // framework changes need human review
    /^app\/api\/agents\//,            // approval routes
    /^app\/api\/webhooks\//,          // stripe, sms, vercel webhooks
    /^app\/api\/stripe/,
    /^app\/api\/cron\//,              // cron entry points
    /^\.env/,                         // any env file
    /^next\.config\./,
    /^package\.json$/,
    /^package-lock\.json$/,
    /^pnpm-lock\.yaml$/,
    /^yarn\.lock$/,
    /^vercel\.json$/,                 // crons + function config
    /^middleware\.ts$/,               // route gating
    /auth/i,                          // anything mentioning auth in path
    /\.sql$/,                         // raw SQL changes
  ] as RegExp[],

  // Max files the agent is allowed to write in one PR. Keeps diffs reviewable.
  maxFilesPerPr: 8,

  // Per-implementation Anthropic spend cap. If the agent burns past this in
  // tokens, the implement route aborts and marks agent_failed.
  maxCostUsdPerImplementation: 5,

  // The Dev agent's iteration cap. Each iteration is one model→tool round.
  // Most diffs land in 6-12 iterations; 20 is the ceiling.
  maxIterations: 20,
};

export type DevConfig = typeof devConfig;

/** Check whether a given repo path is allowed for write. */
export function isPathProtected(path: string): { protected: boolean; rule?: string } {
  for (const rule of devConfig.doNotModify) {
    if (rule.test(path)) {
      return { protected: true, rule: rule.toString() };
    }
  }
  return { protected: false };
}
