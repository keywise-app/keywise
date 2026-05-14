// POST /api/agents/implementations/[id]/merge
//
// Merges the PR, then waits for the prod deploy and captures a prod screenshot.
// Called by:
//   - the manual "Merge to main" button on the dashboard
//   - the screenshot endpoint, when severity is auto-merge eligible

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  waitForUrl,
  captureAndUpload,
  resolveVercelPreviewUrl,
} from "@/agent-tools/screenshot/tools";
import { devConfig } from "@/agents/dev/config";
import { requireAdminApi } from "@/lib/admin-auth";

export const maxDuration = 300;

const PROD_URL = "https://keywise.app";

async function gh<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "keywise-merge",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers as Record<string, string>),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`GitHub ${res.status}: ${data?.message || text}`);
  }
  return data as T;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  const { id: implementationId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: "GITHUB_TOKEN not set" }, { status: 500 });
  }

  // 1. Load implementation
  const { data: impl, error: iErr } = await supabase
    .from("proposal_implementations")
    .select("id, status, pr_number, proposal_id")
    .eq("id", implementationId)
    .maybeSingle();
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  if (!impl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!impl.pr_number) {
    return NextResponse.json({ error: "No PR to merge" }, { status: 400 });
  }
  if (["merged", "shipped", "reverted"].includes(impl.status)) {
    return NextResponse.json({ error: `Already ${impl.status}` }, { status: 400 });
  }

  const { data: proposal } = await supabase
    .from("product_proposals")
    .select("affected_route")
    .eq("id", impl.proposal_id)
    .maybeSingle();
  const route = (proposal?.affected_route || "/").replace(/\/\[[^\]]+\]/g, "");

  // 2. Squash-merge the PR
  await supabase
    .from("proposal_implementations")
    .update({ status: "auto_merging" })
    .eq("id", implementationId);

  let mergeSha: string | undefined;
  try {
    const merge = await gh<{ merged: boolean; sha: string }>(
      `/repos/${devConfig.owner}/${devConfig.repo}/pulls/${impl.pr_number}/merge`,
      { method: "PUT", body: JSON.stringify({ merge_method: "squash" }) }
    );
    if (!merge.merged) throw new Error("GitHub reported merge=false");
    mergeSha = merge.sha;
  } catch (err: any) {
    const msg = err?.message || String(err);
    await supabase
      .from("proposal_implementations")
      .update({ status: "pr_open", error: `Merge failed: ${msg}` })
      .eq("id", implementationId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await supabase
    .from("proposal_implementations")
    .update({
      status: "merged",
      merged_at: new Date().toISOString(),
      // Mark proposal in_progress so the proposals dashboard reflects the state too
    })
    .eq("id", implementationId);
  await supabase
    .from("product_proposals")
    .update({ status: "in_progress" })
    .eq("id", impl.proposal_id);

  // 3. Wait for prod deploy. Poll commit statuses on the merge sha until a
  //    Vercel "Production" status posts. If we can't resolve, we still try the
  //    prod URL — Vercel usually has the deploy live within 90s.
  //
  //    We give Vercel up to 4 minutes to publish a status; if it doesn't, we
  //    fall back to just polling keywise.app for content readiness.
  if (mergeSha) {
    let waited = 0;
    while (waited < 240_000) {
      try {
        const statuses = await gh<any[]>(
          `/repos/${devConfig.owner}/${devConfig.repo}/commits/${mergeSha}/statuses`
        );
        const prod = (statuses || []).find(
          (s: any) =>
            typeof s.context === "string" &&
            s.context.toLowerCase().startsWith("vercel") &&
            s.state === "success"
        );
        if (prod) break;
      } catch {
        // ignore, retry
      }
      await new Promise((r) => setTimeout(r, 10_000));
      waited += 10_000;
    }
  }

  // 4. Poll the prod URL itself to make sure the new code is serving
  const prodFullUrl = `${PROD_URL}${route}`;
  const prodReady = await waitForUrl(prodFullUrl, {
    timeoutMs: 120_000,
    intervalMs: 5000,
  });

  if (!prodReady.ready) {
    await supabase
      .from("proposal_implementations")
      .update({
        error: `Prod URL never returned 200 (last: ${prodReady.finalStatus ?? "no response"}). Merge succeeded but deploy may have failed — check Vercel dashboard.`,
      })
      .eq("id", implementationId);
    return NextResponse.json(
      {
        implementationId,
        merged: true,
        prodReady: false,
        error: "Prod URL didn't go healthy",
      },
      { status: 202 }
    );
  }

  // 5. Screenshot prod
  let prodScreenshotUrl: string | null = null;
  try {
    const storageKey = `${implementationId}/prod.png`;
    const { publicUrl } = await captureAndUpload({
      url: prodFullUrl,
      storageKey,
      supabase,
    });
    prodScreenshotUrl = publicUrl;
  } catch (err: any) {
    // Screenshot failure shouldn't block shipping — log it but mark shipped.
    await supabase
      .from("proposal_implementations")
      .update({
        error: `Prod screenshot failed (merge + deploy succeeded): ${err?.message || err}`,
      })
      .eq("id", implementationId);
  }

  // 6. Mark shipped
  await supabase
    .from("proposal_implementations")
    .update({
      status: "shipped",
      prod_screenshot_url: prodScreenshotUrl,
      shipped_at: new Date().toISOString(),
    })
    .eq("id", implementationId);
  await supabase
    .from("product_proposals")
    .update({ status: "shipped" })
    .eq("id", impl.proposal_id);

  return NextResponse.json({
    implementationId,
    merged: true,
    shipped: true,
    prodScreenshotUrl,
  });
}

// Keep this import to avoid a tree-shake warning for resolveVercelPreviewUrl
// (unused in this file but exported from the same module).
void resolveVercelPreviewUrl;
