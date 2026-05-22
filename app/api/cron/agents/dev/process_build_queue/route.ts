// app/api/cron/agents/dev/process_build_queue/route.ts
//
// Runs every 2 hours during the day. Picks the next non-conflicting queued
// item from build_queue, sets it in_progress, and dispatches:
//   - feature / bug / infra → dev agent → opens PR + preview, never merges
//   - content               → auto-publish via existing publish path (low risk)
//   - marketing             → leave drafts in place; never auto-ship
//
// Picker is deterministic SQL, not an LLM choice. The LLM only writes the diff.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getRole } from "@/agents-framework/registry";
import { runAgent } from "@/agents-framework/runner";

export const maxDuration = 300;

type QueueRow = {
  id: string;
  title: string;
  description: string;
  source_agent: string;
  category: "feature" | "bug" | "content" | "marketing" | "infra";
  priority: "critical" | "high" | "medium" | "low";
  status: string;
  affected_files: string[];
  depends_on: string[];
  rationale: string | null;
  created_at: string;
};

const PRIORITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 } as const;

/**
 * Deterministic picker. Reads all queued + in_progress rows, picks the highest-
 * priority queued item whose affected_files don't overlap any in_progress row
 * and whose depends_on items are all shipped.
 *
 * Doing the join client-side is fine — build_queue will never be large enough
 * for this to matter, and it's much easier to reason about than the equivalent
 * Postgres array-overlap CTE.
 */
function pickNext(rows: QueueRow[]): QueueRow | null {
  const inProgress = rows.filter((r) => r.status === "in_progress");
  const inProgressFiles = new Set<string>();
  for (const r of inProgress) {
    for (const f of r.affected_files ?? []) inProgressFiles.add(f);
  }
  const shippedIds = new Set(rows.filter((r) => r.status === "shipped").map((r) => r.id));

  const candidates = rows
    .filter((r) => r.status === "queued")
    .filter((r) => {
      // Skip if any affected file overlaps an in-progress item
      for (const f of r.affected_files ?? []) {
        if (inProgressFiles.has(f)) return false;
      }
      // Skip if any dependency isn't shipped yet
      for (const dep of r.depends_on ?? []) {
        if (!shippedIds.has(dep)) return false;
      }
      return true;
    });

  candidates.sort((a, b) => {
    const pa = PRIORITY_RANK[a.priority];
    const pb = PRIORITY_RANK[b.priority];
    if (pa !== pb) return pb - pa;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return candidates[0] ?? null;
}

function buildDevPrompt(item: QueueRow): string {
  // The dev agent expects a proposal-shaped prompt. We adapt build_queue rows
  // to that shape so the existing system prompt + tools work unchanged.
  const branch = `build-queue/${item.id.slice(0, 8)}`;
  return [
    `BUILD QUEUE ITEM ${item.id}`,
    `Title: ${item.title}`,
    `Category: ${item.category}`,
    `Priority: ${item.priority}`,
    `Source: ${item.source_agent}`,
    ``,
    `Description:`,
    item.description,
    ``,
    item.rationale ? `Rationale:\n${item.rationale}\n` : ``,
    `INSTRUCTIONS:`,
    `1. Open a git branch named "${branch}".`,
    `2. Make the minimum diff that satisfies the title + description.`,
    `3. Open a PR via github_create_pr. Title = "${item.title}". Body includes the description verbatim plus "## What I changed" and "## Files touched".`,
    `4. NEVER merge to main. NEVER push to production. Human merges.`,
    `5. After the PR is open, call submit_implementation with the PR URL.`,
    ``,
    `If you can't ship this in your guardrails, call report_failure with a one-line reason.`,
  ].join("\n");
}

async function publishContent(supabase: any, item: QueueRow): Promise<{ ok: boolean; note?: string }> {
  // Content category auto-publishes — lower risk than code. We look up the
  // matching blog_drafts row by title (the CMO's mirror call links them) and
  // flip it to published. If we can't find a draft, we just mark the queue
  // item as failed with a note — never invent content here.
  const { data: drafts, error } = await supabase
    .from("blog_drafts")
    .select("id, status")
    .eq("title", item.title)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return { ok: false, note: `blog_drafts lookup failed: ${error.message}` };
  const draft = drafts?.[0];
  if (!draft) return { ok: false, note: "no matching blog_drafts row" };
  if (draft.status === "published") return { ok: true, note: "already published" };

  const { error: upErr } = await supabase
    .from("blog_drafts")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", draft.id);
  if (upErr) return { ok: false, note: `blog_drafts publish failed: ${upErr.message}` };
  return { ok: true };
}

export async function GET(req: NextRequest) {
  // Vercel cron auth
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // 1. Fetch the working set
  const { data: rows, error } = await supabase
    .from("build_queue")
    .select(
      "id, title, description, source_agent, category, priority, status, affected_files, depends_on, rationale, created_at",
    )
    .in("status", ["queued", "in_progress", "shipped"])
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const item = pickNext((rows ?? []) as QueueRow[]);
  if (!item) {
    return NextResponse.json({ picked: null, note: "nothing eligible to ship" });
  }

  // 2. Atomic transition queued → in_progress. Guarded by eq('status','queued')
  //    so a parallel cron tick can't double-claim.
  const { data: claimed, error: claimErr } = await supabase
    .from("build_queue")
    .update({ status: "in_progress" })
    .eq("id", item.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();
  if (claimErr || !claimed) {
    return NextResponse.json(
      { picked: item.id, note: "lost claim race", error: claimErr?.message ?? null },
      { status: 200 },
    );
  }

  // 3. Dispatch by category
  if (item.category === "content") {
    const res = await publishContent(supabase, item);
    if (res.ok) {
      await supabase
        .from("build_queue")
        .update({ status: "shipped", shipped_at: new Date().toISOString() })
        .eq("id", item.id);
      return NextResponse.json({ picked: item.id, category: "content", action: "auto-published" });
    }
    await supabase
      .from("build_queue")
      .update({ status: "failed", decision_note: res.note })
      .eq("id", item.id);
    return NextResponse.json({ picked: item.id, category: "content", action: "failed", note: res.note });
  }

  if (item.category === "marketing") {
    // Marketing drafts never auto-ship. Park them in 'in_progress' for human
    // review — the dashboard surfaces them with a "Mark shipped" button.
    return NextResponse.json({
      picked: item.id,
      category: "marketing",
      action: "parked-for-human-review",
    });
  }

  // 4. Code categories: invoke the dev agent
  const role = getRole("dev");
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  // BELT-AND-BRACES: ensure the prompt never asks for a merge or main push.
  const prompt = buildDevPrompt(item);
  if (/merge to main|push to production|gh pr merge|--merge/i.test(prompt)) {
    await supabase
      .from("build_queue")
      .update({
        status: "failed",
        decision_note: "prompt contained merge/push-to-prod language — aborted",
      })
      .eq("id", item.id);
    return NextResponse.json({ picked: item.id, action: "aborted-by-guardrail" }, { status: 500 });
  }

  try {
    const result = await runAgent(role, "process_build_queue", supabase, anthropic, {
      trigger: "cron",
      promptOverride: prompt,
      metadata: { build_queue_id: item.id },
    });
    // The dev agent calls submit_implementation which populates pr_url on the
    // proposal_implementations table. The dev agent's existing tools don't yet
    // know about build_queue — until they do, just leave the row as
    // in_progress; the dashboard's "Mark shipped" button or a follow-up
    // sync-pr.ts pass will reconcile.
    return NextResponse.json({ picked: item.id, runResult: result });
  } catch (e: any) {
    await supabase
      .from("build_queue")
      .update({
        status: "failed",
        decision_note: `dev agent failed: ${e?.message ?? String(e)}`.slice(0, 1000),
      })
      .eq("id", item.id);
    return NextResponse.json(
      { picked: item.id, action: "failed", error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
