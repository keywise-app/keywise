// lib/agent-tools/pipeline/propose.ts
//
// THE single entry point for adding work to build_queue.
// No agent writes to the table directly — they all call proposeToQueue.
//
// Dedupe rule: sha256(normalize(title) + "|" + category).
// If an active (not rejected/shipped) item with the same hash exists, we
// don't insert a duplicate. If the new proposal is higher priority than
// the existing one, we raise the existing item's priority and refresh the
// description so the dashboard shows the latest reasoning.

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export type Priority = "critical" | "high" | "medium" | "low";
export type SourceAgent = "cpo" | "cmo" | "competitive_intel" | "manual";
export type Category = "feature" | "bug" | "content" | "marketing" | "infra";

export interface ProposeInput {
  title: string;
  description: string;
  sourceAgent: SourceAgent;
  category: Category;
  priority?: Priority;
  affectedFiles?: string[];
  rationale?: string;
  dependsOn?: string[];
}

export type ProposeResult =
  | { created: true; deduped?: false; id: string }
  | { deduped: true; created?: false; existingId: string; updated: boolean };

const PRIORITY_RANK: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export function computeDedupeHash(title: string, category: string): string {
  return createHash("sha256")
    .update(`${normalize(title)}|${category}`)
    .digest("hex");
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "proposeToQueue: NEXT_PUBLIC_SUPABASE_URL and a service-role or anon key are required",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Propose work to the unified build_queue.
 *
 * Returns either:
 *   { created: true,  id }                          — new row inserted
 *   { deduped: true,  existingId, updated: true  }  — existing row's priority raised
 *   { deduped: true,  existingId, updated: false }  — existing row left as-is
 */
export async function proposeToQueue(
  input: ProposeInput,
): Promise<ProposeResult> {
  if (!input.title?.trim()) throw new Error("proposeToQueue: title required");
  if (!input.description?.trim())
    throw new Error("proposeToQueue: description required");

  const sb = admin();
  const priority: Priority = input.priority ?? "medium";
  const dedupeHash = computeDedupeHash(input.title, input.category);

  // 1. Active duplicate?
  const { data: existing, error: lookupErr } = await sb
    .from("build_queue")
    .select("id, priority")
    .eq("dedupe_hash", dedupeHash)
    .not("status", "in", '("rejected","shipped")')
    .maybeSingle();

  if (lookupErr) {
    throw new Error(`build_queue lookup failed: ${lookupErr.message}`);
  }

  if (existing) {
    const newRank = PRIORITY_RANK[priority];
    const oldRank = PRIORITY_RANK[(existing.priority as Priority) ?? "medium"];
    if (newRank > oldRank) {
      const { error: upErr } = await sb
        .from("build_queue")
        .update({ priority, description: input.description })
        .eq("id", existing.id);
      if (upErr) {
        throw new Error(`build_queue upgrade failed: ${upErr.message}`);
      }
      return { deduped: true, existingId: existing.id as string, updated: true };
    }
    return { deduped: true, existingId: existing.id as string, updated: false };
  }

  // 2. New row.
  const { data: inserted, error: insErr } = await sb
    .from("build_queue")
    .insert({
      title: input.title,
      description: input.description,
      source_agent: input.sourceAgent,
      category: input.category,
      priority,
      status: "proposed",
      dedupe_hash: dedupeHash,
      affected_files: input.affectedFiles ?? [],
      depends_on: input.dependsOn ?? [],
      rationale: input.rationale ?? null,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    throw new Error(
      `build_queue insert failed: ${insErr?.message ?? "no row returned"}`,
    );
  }
  return { created: true, id: inserted.id as string };
}
