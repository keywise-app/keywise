// POST /api/agents/implementations/[id]/screenshot
//
// Captures the preview deploy screenshot for an implementation.
// 1. Look up the implementation row (must have pr_number)
// 2. Resolve the Vercel preview URL via GitHub commit statuses
// 3. Wait for the preview to be ready (poll)
// 4. Visit affected_route on the preview, screenshot it, upload to Supabase Storage
// 5. Update row: status='preview_ready', preview_url, preview_screenshot_url

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  resolveVercelPreviewUrl,
  waitForUrl,
  captureAndUpload,
} from "@/agent-tools/screenshot/tools";
import { devConfig } from "@/agents/dev/config";

export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: implementationId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Load implementation + proposal
  const { data: impl, error: iErr } = await supabase
    .from("proposal_implementations")
    .select("id, status, pr_number, proposal_id")
    .eq("id", implementationId)
    .maybeSingle();
  if (iErr) {
    return NextResponse.json({ error: iErr.message }, { status: 500 });
  }
  if (!impl) {
    return NextResponse.json(
      { error: "Implementation not found" },
      { status: 404 }
    );
  }
  if (!impl.pr_number) {
    return NextResponse.json(
      { error: "Implementation has no PR yet; screenshot deferred" },
      { status: 400 }
    );
  }

  const { data: proposal } = await supabase
    .from("product_proposals")
    .select("affected_route")
    .eq("id", impl.proposal_id)
    .maybeSingle();
  const route = proposal?.affected_route || "/";
  // Sanitize the route — Next.js dynamic segments like [id] can't be resolved
  // without a real value. We'll strip them and hit the prefix.
  const cleanRoute = route.replace(/\/\[[^\]]+\]/g, "");

  try {
    // 2. Resolve preview URL
    const { previewUrl } = await resolveVercelPreviewUrl({
      owner: devConfig.owner,
      repo: devConfig.repo,
      prNumber: impl.pr_number,
    });

    if (!previewUrl) {
      await supabase
        .from("proposal_implementations")
        .update({
          error:
            "Couldn't resolve Vercel preview URL — Vercel hasn't posted a status on the PR yet. Try again in a minute.",
        })
        .eq("id", implementationId);
      return NextResponse.json(
        { error: "Preview URL not yet available" },
        { status: 409 }
      );
    }

    // 3. Wait for preview to be ready
    const fullUrl = previewUrl.replace(/\/$/, "") + cleanRoute;
    const ready = await waitForUrl(fullUrl, { timeoutMs: 180_000, intervalMs: 5000 });

    if (!ready.ready) {
      await supabase
        .from("proposal_implementations")
        .update({
          preview_url: previewUrl,
          error: `Preview never went healthy (last status: ${ready.finalStatus ?? "no response"} after ${Math.round(ready.waitedMs / 1000)}s)`,
        })
        .eq("id", implementationId);
      return NextResponse.json(
        { error: "Preview not ready in 3 min" },
        { status: 504 }
      );
    }

    // 4. Capture screenshot
    const storageKey = `${implementationId}/preview.png`;
    const { publicUrl } = await captureAndUpload({
      url: fullUrl,
      storageKey,
      supabase,
    });

    // 5. Update row
    await supabase
      .from("proposal_implementations")
      .update({
        status: "preview_ready",
        preview_url: previewUrl,
        preview_screenshot_url: publicUrl,
        preview_ready_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", implementationId);

    return NextResponse.json({
      implementationId,
      previewUrl,
      screenshotUrl: publicUrl,
      route: cleanRoute,
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    await supabase
      .from("proposal_implementations")
      .update({
        error: `Screenshot failed: ${msg}`.slice(0, 1000),
      })
      .eq("id", implementationId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
