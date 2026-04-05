import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: landlords } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'landlord')
    .not('email', 'is', null);

  let sent = 0;
  for (const landlord of landlords || []) {
    try {
      await sendMonthlySnapshot(landlord, supabase);
      sent++;
    } catch (err: any) {
      console.error('[monthly-snapshot] Failed for', landlord.email, ':', err.message);
    }
  }

  return NextResponse.json({ success: true, sent });
}

export async function sendMonthlySnapshot(landlord: any, supabase: any) {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthStr = lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const monthStart = lastMonth.toISOString().split('T')[0];
  const monthEnd = lastMonthEnd.toISOString().split('T')[0];

  const [paymentsRes, maintenanceRes, leasesRes, expensesRes] = await Promise.all([
    supabase.from('payments').select('*').eq('user_id', landlord.id).gte('due_date', monthStart).lte('due_date', monthEnd),
    supabase.from('maintenance').select('*').eq('user_id', landlord.id),
    supabase.from('leases').select('*').eq('user_id', landlord.id),
    supabase.from('expenses').select('*').eq('user_id', landlord.id).gte('date', monthStart).lte('date', monthEnd),
  ]);

  const payments = paymentsRes.data || [];
  const maintenance = maintenanceRes.data || [];
  const leases = leasesRes.data || [];
  const expenses = expensesRes.data || [];

  // Skip landlords with no data
  if (leases.length === 0) {
    return;
  }

  const expectedRent = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const collectedRent = payments
    .filter((p: any) => p.status === 'paid')
    .reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const overduePayments = payments.filter((p: any) => p.status === 'overdue');
  const openMaintenance = maintenance.filter((m: any) => m.status === 'open').length;
  const resolvedMaintenance = maintenance.filter(
    (m: any) => m.status === 'resolved' && m.resolved_date >= monthStart
  ).length;
  const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const collectionRate = expectedRent > 0 ? Math.round((collectedRent / expectedRent) * 100) : 0;

  const sixtyDaysOut = new Date(now.getTime() + 60 * 86400000).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const upcomingRenewals = leases.filter(
    (l: any) => l.end_date && l.end_date <= sixtyDaysOut && l.end_date >= today
  );

  // AI insight via Claude
  let aiInsight = '';
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://keywise.app';
    const aiRes = await fetch(`${appUrl}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Write a 2-sentence personalized monthly insight for a landlord named ${landlord.full_name || 'there'}. Their ${lastMonthStr} stats: $${collectedRent.toLocaleString()} of $${expectedRent.toLocaleString()} rent collected (${collectionRate}%), ${overduePayments.length} overdue payments, ${openMaintenance} open maintenance issues, ${upcomingRenewals.length} leases renewing soon, $${totalExpenses.toLocaleString()} in expenses. Be encouraging but actionable. No bullet points.`,
      }),
    });
    const aiData = await aiRes.json();
    aiInsight = aiData.result || '';
  } catch (err: any) {
    console.error('[monthly-snapshot] AI insight failed:', err.message);
  }

  const html = buildSnapshotHtml({
    landlord, lastMonthStr, collectedRent, expectedRent, collectionRate,
    overduePayments, openMaintenance, resolvedMaintenance,
    upcomingRenewals, totalExpenses, aiInsight,
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'Keywise <noreply@keywise.app>',
    to: landlord.email,
    subject: `Your ${lastMonthStr} snapshot — $${collectedRent.toLocaleString()} collected`,
    html,
  });

}

function buildSnapshotHtml({
  landlord, lastMonthStr, collectedRent, expectedRent, collectionRate,
  overduePayments, openMaintenance, resolvedMaintenance,
  upcomingRenewals, totalExpenses, aiInsight,
}: {
  landlord: any;
  lastMonthStr: string;
  collectedRent: number;
  expectedRent: number;
  collectionRate: number;
  overduePayments: any[];
  openMaintenance: number;
  resolvedMaintenance: number;
  upcomingRenewals: any[];
  totalExpenses: number;
  aiInsight: string;
}) {
  const firstName = landlord.full_name?.split(' ')[0] || 'there';
  const rentColor = collectionRate === 100 ? '#0F7040' : collectionRate >= 75 ? '#9A6500' : '#C2410C';
  const overdueColor = overduePayments.length > 0 ? '#C2410C' : '#0F7040';
  const renewalColor = upcomingRenewals.length > 0 ? '#9A6500' : '#0F3460';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FF;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0F3460;border-radius:12px 12px 0 0;padding:28px 32px;">
            <div style="color:#00D4AA;font-size:20px;font-weight:700;letter-spacing:-0.3px;">keywise</div>
            <div style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:1.2px;text-transform:uppercase;margin-top:3px;">Property AI</div>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="background:#ffffff;padding:28px 32px 4px;">
            <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0F3460;letter-spacing:-0.5px;">Your ${lastMonthStr} Snapshot</h1>
            <p style="margin:0;font-size:14px;color:#8892A4;">Hi ${firstName}, here's how your portfolio did last month.</p>
          </td>
        </tr>

        <!-- Stats grid -->
        <tr>
          <td style="background:#ffffff;padding:20px 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:12px 12px 12px 0;border-bottom:1px solid #E0E6F0;width:50%;vertical-align:top;">
                  <div style="font-size:10px;color:#8892A4;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Rent Collected</div>
                  <div style="font-size:26px;font-weight:800;color:${rentColor};letter-spacing:-1px;line-height:1;">$${collectedRent.toLocaleString()}</div>
                  <div style="font-size:12px;color:#8892A4;margin-top:4px;">of $${expectedRent.toLocaleString()} expected · <strong>${collectionRate}%</strong></div>
                </td>
                <td style="padding:12px 0 12px 12px;border-bottom:1px solid #E0E6F0;border-left:1px solid #E0E6F0;width:50%;vertical-align:top;">
                  <div style="font-size:10px;color:#8892A4;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Overdue Payments</div>
                  <div style="font-size:26px;font-weight:800;color:${overdueColor};letter-spacing:-1px;line-height:1;">${overduePayments.length}</div>
                  <div style="font-size:12px;color:#8892A4;margin-top:4px;">${overduePayments.length === 0 ? 'All paid on time ✓' : overduePayments.length === 1 ? '1 payment overdue' : `${overduePayments.length} payments overdue`}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 12px 12px 0;vertical-align:top;">
                  <div style="font-size:10px;color:#8892A4;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Open Maintenance</div>
                  <div style="font-size:26px;font-weight:800;color:#0F3460;letter-spacing:-1px;line-height:1;">${openMaintenance}</div>
                  <div style="font-size:12px;color:#8892A4;margin-top:4px;">${resolvedMaintenance} resolved this month</div>
                </td>
                <td style="padding:12px 0 12px 12px;border-left:1px solid #E0E6F0;vertical-align:top;">
                  <div style="font-size:10px;color:#8892A4;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Renewals (60 days)</div>
                  <div style="font-size:26px;font-weight:800;color:${renewalColor};letter-spacing:-1px;line-height:1;">${upcomingRenewals.length}</div>
                  <div style="font-size:12px;color:#8892A4;margin-top:4px;">${upcomingRenewals.length === 0 ? 'No renewals due' : `lease${upcomingRenewals.length !== 1 ? 's' : ''} expiring soon`}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${totalExpenses > 0 ? `
        <!-- Expenses -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 20px;">
            <div style="background:#F0F4FF;border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:12px;">
              <span style="font-size:13px;color:#4A5068;">Total expenses last month: <strong style="color:#0F3460;">$${totalExpenses.toLocaleString()}</strong></span>
            </div>
          </td>
        </tr>
        ` : ''}

        ${upcomingRenewals.length > 0 ? `
        <!-- Renewals alert -->
        <tr>
          <td style="background:#FFF8E0;border-left:3px solid #F59E0B;padding:16px 32px;">
            <div style="font-weight:700;font-size:12px;color:#9A6500;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">⚠ Lease Renewals Coming Up</div>
            ${upcomingRenewals.map((l: any) => `<div style="font-size:13px;color:#4A5068;margin-bottom:4px;">${l.tenant_name} — expires ${l.end_date}</div>`).join('')}
          </td>
        </tr>
        ` : ''}

        ${aiInsight ? `
        <!-- AI Insight -->
        <tr>
          <td style="background:#E0FAF5;border-left:3px solid #00D4AA;padding:16px 32px;">
            <div style="font-size:10px;font-weight:700;color:#00A886;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">✦ Keywise AI Insight</div>
            <div style="font-size:14px;color:#1A1A2E;line-height:1.7;">${aiInsight}</div>
          </td>
        </tr>
        ` : ''}

        <!-- CTA -->
        <tr>
          <td style="background:#ffffff;padding:28px 32px;border-radius:0 0 12px 12px;text-align:center;">
            <a href="https://keywise.app" style="display:inline-block;background:#0F3460;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 32px;border-radius:8px;letter-spacing:0.2px;">
              View Full Dashboard →
            </a>
            <p style="margin:20px 0 0;font-size:12px;color:#8892A4;line-height:1.6;">
              You're receiving this monthly snapshot because you have a Keywise account.<br>
              <a href="https://keywise.app/?page=settings" style="color:#8892A4;text-decoration:underline;">Manage email preferences</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 0;text-align:center;">
            <div style="font-size:11px;color:#8892A4;">Keywise · Property management, made intelligent</div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
