// app/api/cron/trial-nurture/route.ts
//
// Daily trial lifecycle emails. Built because trial_ends_at was never set
// for anyone who signed up via the actual advertised no-credit-card trial
// path (see migration 20260823000000_trial_clock_and_nurture_log.sql) --
// there was no clock to key any lifecycle email off of, and separately,
// zero automated re-engagement existed for the ~44% of signups who never
// activate (documented in lib/agents/cmo/context.md).
//
// Three one-time stages per user, tracked in trial_nurture_log so nothing
// double-sends on the next daily run:
//   activation_nudge  -- day 3+, zero properties added (never activated)
//   ending_soon       -- 1-3 days left on the trial
//   expired_winback   -- trial has ended (fires once, whenever this first
//                        notices it -- covers both "just expired" and the
//                        backfilled users who've been overdue for months)
//
// Supports ?dryRun=true: computes exactly who would receive what, without
// calling Resend or writing to trial_nurture_log. Use this to verify against
// real data before the first live send.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { requireAdminApi } from "@/lib/admin-auth";

export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);

const N = "#0F3460";
const TEAL = "#00D4AA";
const BG = "#F0F4FF";
const BORDER = "#E0E6F0";
const INK_MID = "#4A5068";

function wrapEmail(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:${BG};">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border:1px solid ${BORDER};border-radius:12px;padding:28px;">
      ${bodyHtml}
      <p style="font-size:12px;color:#8892A4;margin:24px 0 0;">
        Keywise, built for California landlords. Reply to this email if you have a question -- it comes straight to Chris.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${TEAL};color:${N};font-weight:700;font-size:14px;padding:12px 22px;border-radius:8px;text-decoration:none;margin-top:8px;">${label}</a>`;
}

function firstName(fullName: string | null): string {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return "there";
  return trimmed.split(" ")[0];
}

type Stage = "activation_nudge" | "ending_soon" | "expired_winback";

function buildEmail(stage: Stage, name: string, daysUntilEnd: number): { subject: string; html: string } {
  if (stage === "activation_nudge") {
    return {
      subject: "Quick one -- did Keywise work for you?",
      html: wrapEmail(`
        <p style="font-size:14px;color:${INK_MID};line-height:1.6;">Hey ${name},</p>
        <p style="font-size:14px;color:${INK_MID};line-height:1.6;">
          I noticed you signed up for Keywise but haven't added a property yet. I built this because Venmo and spreadsheets weren't cutting it for my own duplex, so if something in the setup didn't make sense, that's on me to fix -- just reply and tell me where you got stuck.
        </p>
        <p style="font-size:14px;color:${INK_MID};line-height:1.6;">
          If you just haven't gotten to it: adding your first property takes about a minute, and everything else (rent collection, lease info, compliance tools) builds off that.
        </p>
        ${ctaButton("https://keywise.app/", "Add your first property")}
      `),
    };
  }

  if (stage === "ending_soon") {
    return {
      subject: `Your Keywise trial ends in ${daysUntilEnd} day${daysUntilEnd === 1 ? "" : "s"}`,
      html: wrapEmail(`
        <p style="font-size:14px;color:${INK_MID};line-height:1.6;">Hey ${name},</p>
        <p style="font-size:14px;color:${INK_MID};line-height:1.6;">
          Your Keywise trial wraps up in <strong>${daysUntilEnd} day${daysUntilEnd === 1 ? "" : "s"}</strong>. After that, you'll lose access to online rent collection, AI lease extraction, and the compliance alerts -- the free tier only covers 1 unit and the core compliance tools.
        </p>
        <div style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:14px;margin:16px 0;">
          <div style="font-size:12px;color:#8892A4;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Founding member rate</div>
          <div style="font-size:14px;color:${N};line-height:1.5;">
            $29/mo for life, locked in -- limited to the first 100 California landlords. Still open right now. Regular price is $49/mo (or $390/yr).
          </div>
        </div>
        ${ctaButton("https://keywise.app/pricing", "Keep your account")}
      `),
    };
  }

  return {
    subject: "Your Keywise trial ended -- still want in?",
    html: wrapEmail(`
      <p style="font-size:14px;color:${INK_MID};line-height:1.6;">Hey ${name},</p>
      <p style="font-size:14px;color:${INK_MID};line-height:1.6;">
        Your Keywise trial ended. No hard feelings -- if the timing wasn't right, your account and data are still there whenever you want to pick it back up.
      </p>
      <p style="font-size:14px;color:${INK_MID};line-height:1.6;">
        If you want back in, the founding member rate ($29/mo for life, first 100 CA landlords) may still be open.
      </p>
      ${ctaButton("https://keywise.app/pricing", "See current pricing")}
    `),
  };
}

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: trialUsers, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at, trial_ends_at")
    .eq("subscription_status", "trial")
    .not("email", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const results: { userId: string; email: string; stage: Stage; daysUntilEnd: number; sent: boolean }[] = [];

  for (const user of trialUsers || []) {
    if (!user.trial_ends_at) continue; // shouldn't happen post-migration, but stay safe

    const daysUntilEnd = Math.ceil((new Date(user.trial_ends_at).getTime() - now) / 86400000);
    const daysSinceSignup = Math.floor((now - new Date(user.created_at).getTime()) / 86400000);

    let stage: Stage | null = null;

    if (daysUntilEnd <= 0) {
      stage = "expired_winback";
    } else if (daysUntilEnd <= 3) {
      stage = "ending_soon";
    } else if (daysSinceSignup >= 3) {
      const { count } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if ((count ?? 0) === 0) stage = "activation_nudge";
    }

    if (!stage) continue;

    // Already sent this stage to this user?
    const { data: existing } = await supabase
      .from("trial_nurture_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("email_type", stage)
      .maybeSingle();
    if (existing) continue;

    const { subject, html } = buildEmail(stage, firstName(user.full_name), Math.max(daysUntilEnd, 0));

    if (!dryRun) {
      const { error: sendError } = await resend.emails.send({
        from: "Chris at Keywise <noreply@keywise.app>",
        to: user.email!,
        subject,
        html,
      });
      if (sendError) {
        console.error(`[trial-nurture] send failed for ${user.email}:`, sendError);
        results.push({ userId: user.id, email: user.email!, stage, daysUntilEnd, sent: false });
        continue;
      }
      await supabase.from("trial_nurture_log").insert({ user_id: user.id, email_type: stage });
    }

    results.push({ userId: user.id, email: user.email!, stage, daysUntilEnd, sent: !dryRun });
  }

  return NextResponse.json({ dryRun, checked: (trialUsers || []).length, results });
}
