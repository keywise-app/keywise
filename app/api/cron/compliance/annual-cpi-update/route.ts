import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { calculateAB1482, AB1482Input } from '../../../../../lib/compliance/ca/ab1482-calculator';

export const runtime = 'nodejs';
export const maxDuration = 120;

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const currentYear = new Date().getFullYear();
  const effectiveDate = new Date().toISOString().split('T')[0];

  // Get users with compliance notifications enabled and AB 1482 properties
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('notify_compliance', true);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: 'No users with compliance notifications', sent: 0 });
  }

  let emailsSent = 0;
  const errors: string[] = [];

  for (const profile of profiles) {
    // Get their AB 1482 properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id, address, zip_code, year_built, property_type, current_rent, last_rent_increase_date, last_rent_increase_amount')
      .eq('user_id', profile.id)
      .eq('ab1482_subject', true);

    if (!properties || properties.length === 0) continue;

    // Recalculate each unit with current CPI
    const rows: { address: string; cap: string; maxIncrease: string; maxRent: string; note: string }[] = [];

    for (const prop of properties) {
      const input: AB1482Input = {
        zipCode: prop.zip_code || '90001',
        yearBuilt: prop.year_built || 1990,
        propertyType: prop.property_type || 'multifamily',
        ownerType: 'individual',
        currentRent: prop.current_rent || 0,
        effectiveDate,
        lastIncreaseDate: prop.last_rent_increase_date || null,
        lastIncreaseAmount: prop.last_rent_increase_amount || null,
      };

      const result = calculateAB1482(input);

      // Save updated calculation
      await supabase.from('compliance_calculations').insert({
        user_id: profile.id,
        property_id: prop.id,
        calculator: 'ab1482',
        input_data: input,
        result_data: result,
        effective_date: effectiveDate,
        created_at: new Date().toISOString(),
      });

      if (result.eligible) {
        rows.push({
          address: prop.address || `Unit (${prop.zip_code})`,
          cap: `${result.applicableCap}%`,
          maxIncrease: `$${result.maxIncreaseDollars?.toLocaleString() || '0'}`,
          maxRent: `$${result.maxNewRent?.toLocaleString() || '0'}`,
          note: result.localOverrides ? `${result.localOrdinance?.city} local rate` : `CPI: ${result.cpiValue}%`,
        });
      } else {
        rows.push({
          address: prop.address || `Unit (${prop.zip_code})`,
          cap: 'Exempt',
          maxIncrease: '-',
          maxRent: '-',
          note: result.exemptionReason?.substring(0, 60) || 'Exempt',
        });
      }
    }

    // Build and send email
    const tableRows = rows.map(r => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #E0E6F0;font-size:13px;color:#1A1A2E;">${r.address}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E0E6F0;font-size:13px;color:#1A1A2E;text-align:center;">${r.cap}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E0E6F0;font-size:13px;color:#1A1A2E;text-align:right;">${r.maxIncrease}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E0E6F0;font-size:13px;color:#1A1A2E;text-align:right;">${r.maxRent}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E0E6F0;font-size:12px;color:#8892A4;">${r.note}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#F0F4FF;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#0F3460;border-radius:12px 12px 0 0;padding:24px 28px;">
      <div style="font-size:18px;font-weight:700;color:#fff;">Your ${currentYear} California rent cap rates are here</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:6px;">Updated with the latest CPI data from the Bureau of Labor Statistics.</div>
    </div>
    <div style="background:#fff;border:1px solid #E0E6F0;border-top:none;border-radius:0 0 12px 12px;padding:24px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#F0F4FF;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#0F3460;text-transform:uppercase;letter-spacing:0.5px;">Property</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:700;color:#0F3460;text-transform:uppercase;letter-spacing:0.5px;">Cap</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#0F3460;text-transform:uppercase;letter-spacing:0.5px;">Max Increase</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#0F3460;text-transform:uppercase;letter-spacing:0.5px;">New Rent</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#0F3460;text-transform:uppercase;letter-spacing:0.5px;">Note</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div style="padding:20px 24px 0;">
        <a href="https://keywise.app/tools/ca/ab1482-calculator" style="display:inline-block;background:#00D4AA;color:#0F3460;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">Review your calculations &rarr;</a>
      </div>
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
        subject: `Your ${currentYear} California rent cap rates are here`,
        html,
      });
      if (emailError) {
        console.error('[annual-cpi-update] Resend error for', profile.email, emailError);
        errors.push(`${profile.email}: ${emailError.message}`);
      } else {
        emailsSent++;
      }
    } catch (err: any) {
      console.error('[annual-cpi-update] Email send failed:', err.message);
      errors.push(`${profile.email}: ${err.message}`);
    }
  }

  return NextResponse.json({
    message: `Annual CPI update complete`,
    sent: emailsSent,
    errors: errors.length > 0 ? errors : undefined,
  });
}
