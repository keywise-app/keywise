// src/framework/registry.ts
import type { AgentRole } from "./types";
import { cmoRole } from "@/agents/cmo";
import { cpoRole } from "@/agents/cpo";

export const roles: Record<string, AgentRole> = {
  cmo: cmoRole,
  cpo: cpoRole,
  // cro: croRole,           // ← add when built
  // success: successRole,
  // chief_of_staff: chiefOfStaffRole,
};

export function getRole(id: string): AgentRole {
  const r = roles[id];
  if (!r) throw new Error(`Unknown agent role: ${id}`);
  return r;
}
