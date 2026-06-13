import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// GET /api/cron/compliance/deposit-deadline-check
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const today = new Date();
  const todayISO = toISO(today);

  // Find draft itemizations with approaching deadlines
  // We want to alert at 14, 7, and 3 days before deadline
  const alertDays = [14, 7, 3];
  const alertDates = alertDays.map((d) => toISO(addDays(today, d)));

  const { data: itemizations } = await supabase
    .from('deposit_itemizations')
    .select('id, unit_id, user_id, deadline_at, deposit_amount, balance_to_tenant, tenant_email, move_out_date')
    .eq('status', 'draft')
    .in('deadline_at', alertDates.map((d) => `${d}T00:00:00.000Z`));

  // Also check for deadlines that fall on alert dates using date comparison
  // (since deadline_at might have different time components)
  const { data: itemizationsByDate } = await supabase
    .from('deposit_itemizations')
    .select('id, unit_id, user_id, deadline_at, deposit_amount, balance_to_tenant, tenant_email, move_out_date')
    .eq('status', 'draft')
    .not('deadline_at', 'is', null);

  // Combine and dedupe
  const allItemizations = [...(itemizations ?? []), ...(itemizationsByDate ?? [])];
  const seen = new Set<string>();
  const uniqueItemizations = allItemizations.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // Filter to items where deadline is at an alert threshold
  const toAlert = uniqueItemizations.filter((item) => {
    if (!item.deadline_at) return false;
    const deadlineDate = new Date(item.deadline_at);
    const daysRemaining = Math.ceil(
      (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return alertDays.includes(daysRemaining);
  });

  if (toAlert.length === 0) {
    return NextResponse.json({ message: 'No deadline alerts to send', sent: 0 });
  }

  // Group by user
  const byUser: Record<string, typeof toAlert> = {};
  for (const item of toAlert) {
    if (!byUser[item.user_id]) byUser[item.user_id] = [];
    byUser[item.user_id].push(item);
  }

  let emailsSent = 0;
  const errors: string[] = [];

  for (const [userId, items] of Object.entries(byUser)) {
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, notify_compliance')
      .eq('id', userId)
      .single();

    if (!profile || !profile.notify_compliance || !profile.email) continue;

    for (const item of items) {
      const deadlineDate = new Date(item.deadline_at);
      const daysRemaining = Math.ceil(
        (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Get unit address
      const { data: unit } = await supabase
        .from('units')
        .select('address')
        .eq('id', item.unit_id)
        .single();

      const address = unit?.address || 'your unit';
      const tenantLabel = item.tenant_email || 'your tenant';
      const deadlineDateStr = formatDate(deadlineDate);

      const subject = `\u26A0 ${daysRemaining} days left to return ${tenantLabel}'s security deposit`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#F0F4FF;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border:1px solid #E0E6F0;border-radius:12px;padding:28px;">
      <div style="font-size:18px;font-weight:700;color:#0F3460;margin-bottom:8px;">
        Security Deposit Deadline${daysRemaining <= 3 ? ' -- Urgent' : ''}
      </div>
      <p style="font-size:14px;color:#4A5068;line-height:1.6;margin:0 0 16px;">
        You have <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong> remaining to return the security deposit or provide an itemized statement for <strong>${address}</strong>.
      </p>
      <div style="background:${daysRemaining <= 3 ? '#FFF0F0' : '#FFF8E0'};border:1px solid ${daysRemaining <= 3 ? '#FF6B6B' : '#FFB347'}44;border-radius:8px;padding:14px;margin-bottom:16px;">
        <div style="font-size:12px;color:${daysRemaining <= 3 ? '#FF6B6B' : '#9A6500'};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Deadline</div>
        <div style="font-size:20px;font-weight:800;color:#0F3460;">${deadlineDateStr}</div>
      </div>
      ${item.deposit_amount ? `
      <div style="background:#E0FAF5;border:1px solid #00D4AA44;border-radius:8px;padding:14px;margin-bottom:16px;">
        <div style="font-size:12px;color:#00A886;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Deposit Amount</div>
        <div style="font-size:24px;font-weight:800;color:#0F3460;">$${item.deposit_amount.toLocaleString()}</div>
      </div>` : ''}
      <p style="font-size:13px;color:#8892A4;margin:0 0 16px;">
        Under California Civil Code 1950.5, you must return the deposit or provide an itemized statement of deductions within 21 days of the tenant vacating. Missing this deadline forfeits all deduction rights.
      </p>
      <a href="https://keywise.app/inspections/itemize/${item.unit_id}" style="display:inline-block;background:#0F3460;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">Review itemization &rarr;</a>
    </div>
    <div style="text-align:center;padding:20px;font-size:11px;color:#8892A4;">
      You received this because you have compliance alerts enabled in Keywise.
      <br><a href="https://keywise.app" style="color:#8892A4;">Manage notifications</a>
    </div>
  </div>
</body>
</html>`;

      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Keywise <noreply@keywise.app>',
          to: profile.email,
          subject,
          html,
        });
        if (emailError) {
          console.error('[deposit-deadline-check] Resend error:', emailError);
          errors.push(`${profile.email}: ${emailError.message}`);
        } else {
          emailsSent++;
        }
      } catch (err: any) {
        console.error('[deposit-deadline-check] Email send failed:', err.message);
        errors.push(`${profile.email}: ${err.message}`);
      }
    }
  }

  return NextResponse.json({
    message: 'Deposit deadline check complete',
    sent: emailsSent,
    checked: toAlert.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
