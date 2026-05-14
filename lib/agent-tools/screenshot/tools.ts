// lib/agent-tools/screenshot/tools.ts
// Headless Chromium screenshot helper, for capturing Vercel preview + prod deploys.
//
// Dependencies (you must install these as a separate step):
//   npm install puppeteer-core @sparticuz/chromium
//
// They aren't in the agent guardrails. Once installed, this file just works.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "proposal-screenshots";

// Dynamically import puppeteer-core + @sparticuz/chromium at runtime.
// `as any` keeps tsc happy when the deps aren't installed yet, and a clear
// error fires if you try to screenshot without them.
async function getBrowser(): Promise<any> {
  try {
    const chromiumMod: any = await import("@sparticuz/chromium");
    const puppeteerMod: any = await import("puppeteer-core");
    const chromium = chromiumMod.default ?? chromiumMod;
    const puppeteer = puppeteerMod.default ?? puppeteerMod;

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    return browser;
  } catch (err: any) {
    throw new Error(
      "Screenshot dependencies missing. Install with: " +
        "npm install puppeteer-core @sparticuz/chromium" +
        " — underlying error: " +
        (err?.message || String(err))
    );
  }
}

/**
 * Poll a URL until it returns 2xx or 3xx (so Vercel preview is ready),
 * or time out. Returns true if ready.
 */
export async function waitForUrl(
  url: string,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<{ ready: boolean; finalStatus?: number; waitedMs: number }> {
  const timeoutMs = options.timeoutMs ?? 180_000; // 3 min default
  const intervalMs = options.intervalMs ?? 5000;
  const start = Date.now();
  let lastStatus: number | undefined;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow" });
      lastStatus = res.status;
      if (res.status >= 200 && res.status < 400) {
        return {
          ready: true,
          finalStatus: res.status,
          waitedMs: Date.now() - start,
        };
      }
    } catch {
      // Network error — preview not ready yet, keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return { ready: false, finalStatus: lastStatus, waitedMs: Date.now() - start };
}

/**
 * Capture a screenshot of the given URL and upload to Supabase Storage.
 * Returns the public URL.
 */
export async function captureAndUpload(args: {
  url: string;
  storageKey: string; // path inside bucket, e.g. "impl-abc/preview.png"
  supabase?: SupabaseClient;
}): Promise<{ publicUrl: string; bytes: number }> {
  const supabase =
    args.supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    // networkidle0 = no requests for 500ms. Falls back to a hard 12s ceiling.
    await page.goto(args.url, {
      waitUntil: "networkidle0",
      timeout: 12_000,
    }).catch(async () => {
      // If networkidle0 didn't settle in 12s, fall back to domcontentloaded
      // and grab whatever rendered. Beats failing.
      await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 8000 });
    });
    // Small additional wait for client-side hydration
    await new Promise((r) => setTimeout(r, 2000));

    const png: Buffer = await page.screenshot({ type: "png", fullPage: false });

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(args.storageKey, png, {
        contentType: "image/png",
        upsert: true,
      });
    if (upErr) {
      throw new Error(`Storage upload failed: ${upErr.message}`);
    }

    const { data: pub } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(args.storageKey);

    return { publicUrl: pub.publicUrl, bytes: png.length };
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Resolve a PR's Vercel preview URL via GitHub commit statuses.
 * Vercel posts a status with context starting with "Vercel" and target_url
 * pointing to the preview deploy.
 */
export async function resolveVercelPreviewUrl(args: {
  owner: string;
  repo: string;
  prNumber: number;
}): Promise<{ previewUrl: string | null; commitSha: string | null }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "keywise-screenshot",
  };

  // 1. Get the PR to find the head sha
  const pr = await fetch(
    `https://api.github.com/repos/${args.owner}/${args.repo}/pulls/${args.prNumber}`,
    { headers: ghHeaders }
  ).then((r) => r.json());
  const sha = pr?.head?.sha;
  if (!sha) return { previewUrl: null, commitSha: null };

  // 2. List statuses for that sha
  const statuses = await fetch(
    `https://api.github.com/repos/${args.owner}/${args.repo}/commits/${sha}/statuses`,
    { headers: ghHeaders }
  ).then((r) => r.json());

  // Statuses are newest-first; find the latest successful Vercel preview status.
  // Vercel uses contexts like "Vercel" or "Vercel – keywise"; the production
  // deploy is also a "Vercel" context but only on main.
  const vercelStatus = (statuses || []).find(
    (s: any) =>
      typeof s.context === "string" &&
      s.context.toLowerCase().startsWith("vercel") &&
      s.state === "success" &&
      s.target_url
  );

  return { previewUrl: vercelStatus?.target_url ?? null, commitSha: sha };
}
