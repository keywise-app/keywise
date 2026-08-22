// src/framework/registry.ts
import type { AgentRole } from "./types";
import { cmoRole } from "@/agents/cmo";
import { devRole } from "@/agents/dev";

// cpo role removed 2026-08-22: its only non-stubbed tool was a filesystem
// scan of app/ routes; support-ticket and competitor-UX analysis both read
// hardcoded fake data. lib/agents/cpo/config.ts stays — the Dev pipeline's
// implement_proposal task still uses its auto-merge threshold for the 71
// existing product_proposals rows, which remain viewable/approvable at
// /admin/agents/product-proposals.
export const roles: Record<string, AgentRole> = {
  cmo: cmoRole,
  dev: devRole,
};

export function getRole(id: string): AgentRole {
  const r = roles[id];
  if (!r) throw new Error(`Unknown agent role: ${id}`);
  return r;
}
