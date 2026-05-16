// POST /api/agents/product-proposals/[id]/implement
//
// 1. Marks the proposal 'approved' and creates a queued proposal_implementations row
// 2. Fires the Dev agent with a prompt that includes the proposal text + implementationId
// 3. Returns immediately with implementationId. The agent runs server-side; the dashboard
//    polls by reloading. (Vercel function maxDuration covers the full agent run.)

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getRole } from "@/agents-framework/registry";
import { runAgent } from "@/agents-framework/runner";
import { devConfig } from "@/agents/dev/config";
import * as fs from "fs";
import * as path from "path";

const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js"];

/**
 * Walks app/ and returns every route that has a real page file.
 * Mirrors the logic in lib/agent-tools/product/tools.ts. We duplicate it here
 * so this route can pre-flight without instantiating an agent.
 */
function realRoutes(): string[] {
  const APP_DIR = path.join(process.cwd(), "app");
  const out: string[] = [];
  function recurse(absDir: string, segs: string[]) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    if (
      PAGE_FILES.some((f) =>
        entries.some((e) => e.isFile() && e.name === f)
      )
    ) {
      const r = "/" + segs.filter(Boolean).join("/");
      out.push(r === "/" ? "/" : r.replace(/\/$/, ""));
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const n = e.name;
      if (
        n.startsWith("_") ||
        n.startsWith("@") ||
        n === "api" ||
        n === "node_modules"
      )
        continue;
      const isGroup = /^\(.+\)$/.test(n);
      recurse(path.join(absDir, n), isGroup ? segs : [...segs, n]);
    }
  }
  recurse(APP_DIR, []);
  return out;
}

export const maxDuration = 300; // 5 minutes — enough for most Dev agent runs

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Verify proposal
  const { data: proposal, error: pErr } = await supabase
    .from("product_proposals")
    .select("id, status, title, description, severity, affected_route")
    .eq("id", proposalId)
    .maybeSingle();
  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status === "shipped") {
    return NextResponse.json({ error: "Already shipped" }, { status: 400 });
  }

  // 2. Pre-flight: refuse before spending tokens if affected_route doesn't
  //    exist in app/. The Dev agent's own fail-fast catches this for ~$0.09 per
  //    attempt; the pre-flight catches it for $0 and skips the agent run entirely.
  //    Bypassed only when there's no affected_route to check.
  if (proposal.affected_route) {
    const routes = realRoutes();
    if (!routes.includes(proposal.affected_route)) {
      // Create an implementation row that's pre-failed, so the dashboard reflects
      // the attempt rather than silently swallowing the click.
      const { data: deadImpl } = await supabase
        .from("proposal_implementations")
        .insert({
          proposal_id: proposalId,
          status: "agent_failed",
          error: `Pre-flight refused: affected_route "${proposal.affected_route}" does not exist in app/. ${routes.length} real routes available; the feature this proposal targets likely hasn't been built yet. Edit the proposal's affected_route to a real route, or reject it as a feature-build idea.`,
          cost_usd: 0,
        })
        .select("id")
        .single();
      return NextResponse.json(
        {
          implementationId: deadImpl?.id,
          error: `affected_route "${proposal.affected_route}" does not exist in app/. Pre-flight refused at $0 cost.`,
          realRoutes: routes,
        },
        { status: 400 }
      );
    }
  }

  // 3. Approve the proposal
  const now = new Date().toISOString();
  await supabase
    .from("product_proposals")
    .update({
      status: "approved",
      decided_at: now,
      decided_by: "chris",
      decision_note: "Approved & implement clicked — Dev agent fired.",
    })
    .eq("id", proposalId);

  // 4. Create implementation row
  const { data: impl, error: iErr } = await supabase
    .from("proposal_implementations")
    .insert({
      proposal_id: proposalId,
      status: "agent_running",
    })
    .select("id")
    .single();
  if (iErr) {
    return NextResponse.json({ error: iErr.message }, { status: 500 });
  }
  const implementationId = impl.id;

  // 4. Refuse to fire the agent if GITHUB_TOKEN isn't set — caught early
  //    rather than after a confusing failure inside a tool call.
  if (!process.env.GITHUB_TOKEN) {
    await supabase
      .from("proposal_implementations")
      .update({
        status: "agent_failed",
        error:
          "GITHUB_TOKEN env var is not set in this deployment. Add a GitHub PAT with `repo` scope to Vercel and redeploy.",
      })
      .eq("id", implementationId);
    return NextResponse.json(
      {
        implementationId,
        error: "GITHUB_TOKEN not configured",
      },
      { status: 500 }
    );
  }

  // 5. Build the agent prompt — proposal text + implementationId for submit/report tools
  const promptOverride = buildDevPrompt({
    implementationId,
    proposalId,
    title: proposal.title,
    description: proposal.description,
    severity: proposal.severity,
    affectedRoute: proposal.affected_route,
  });

  // 6. Fire the Dev agent
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const role = getRole("dev");

  // Fire-and-forget on the same Vercel function (we have maxDuration=300).
  // Wrapped in a try/catch so framework errors land as agent_failed.
  try {
    const result = await runAgent(role, "implement_proposal", supabase, anthropic, {
      trigger: "manual",
      promptOverride,
      metadata: { implementationId, proposalId },
    });

    // The agent SHOULD have called submit_implementation or report_failure, which
    // updates proposal_implementations.status. If it didn't, the row is stuck on
    // 'agent_running' — flip it to agent_failed with the run summary.
    const { data: current } = await supabase
      .from("proposal_implementations")
      .select("status")
      .eq("id", implementationId)
      .maybeSingle();

    if (current?.status === "agent_running") {
      await supabase
        .from("proposal_implementations")
        .update({
          status: "agent_failed",
          error:
            "Agent finished without calling submit_implementation or report_failure. " +
            "Summary: " +
            (result.summary || "(no summary)"),
          cost_usd: result.costUsd,
          agent_run_id: result.runId,
        })
        .eq("id", implementationId);
    } else {
      // Successful path or self-reported failure — just record the cost
      await supabase
        .from("proposal_implementations")
        .update({
          cost_usd: result.costUsd,
          agent_run_id: result.runId,
        })
        .eq("id", implementationId);
    }

    // Fire the screenshot capture in the background. We don't await the
    // response here — the agent's already done, and the screenshot endpoint
    // has its own maxDuration. If this fetch returns before the screenshot
    // completes, the dashboard still picks up the row update via reload.
    const baseUrl =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
    if (current?.status === "pr_open" || current?.status === "agent_running") {
      // Status will be pr_open if the agent called submit_implementation.
      // Don't await — let it run in the background.
      void fetch(
        `${baseUrl}/api/agents/implementations/${implementationId}/screenshot`,
        { method: "POST" }
      ).catch((e) => console.error("[implement] screenshot kick failed:", e));
    }

    return NextResponse.json({
      implementationId,
      runId: result.runId,
      status: result.status,
      costUsd: result.costUsd,
      summary: result.summary,
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    await supabase
      .from("proposal_implementations")
      .update({
        status: "agent_failed",
        error: `Agent crashed: ${msg}`.slice(0, 1000),
      })
      .eq("id", implementationId);
    return NextResponse.json(
      { implementationId, error: msg },
      { status: 500 }
    );
  }
}

function buildDevPrompt(args: {
  implementationId: string;
  proposalId: string;
  title: string;
  description: string;
  severity: string;
  affectedRoute: string | null;
}): string {
  return `You have been assigned ONE approved product proposal. Implement the smallest possible diff to ship it, then open a PR.

**Implementation ID:** ${args.implementationId}
(You MUST pass this exact value as \`implementationId\` to submit_implementation or report_failure at the end of your run.)

**Proposal ID:** ${args.proposalId}
**Severity:** ${args.severity}
**Affected route:** ${args.affectedRoute ?? "(none specified)"}

**Title:** ${args.title}

**Description:**

${args.description}

---

WORKFLOW
1. Read the proposal above. Identify the smallest possible diff that ships the Proposed change.
2. Find the affected files. Start from \`${args.affectedRoute ? "app" + args.affectedRoute + "/page.tsx" : "the affected_route"}\` and search outward.
3. Read those files via github_read_file (save the sha — you need it to update).
4. Create branch \`cpo/proposal-${args.implementationId.slice(0, 8)}\` via github_create_branch.
5. Write your changes via github_write_file (cap: ${devConfig.maxFilesPerPr} files).
6. Open the PR via github_create_pr:
   - Title: "${args.title}"
   - Body: the full proposal description quoted, then ## What I changed / ## Files touched / ## Notes.
7. Call submit_implementation with implementationId=${args.implementationId}.

IF YOU CAN'T DO IT
If the proposal genuinely needs a guardrail file (migrations, agents framework, billing,
auth, package.json, etc.), STOP and call report_failure with implementationId=${args.implementationId}
and a specific reason. Don't try to route around guardrails — they exist because the wrong
fix in those areas is a real customer incident.

Now begin. Read the context document if you need a refresher on the minimum-diff principle.`;
}
