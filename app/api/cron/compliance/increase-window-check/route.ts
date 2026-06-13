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

function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const today = new Date();
  const todayISO = toISO(today);

  // Find properties with ab1482_subject=true and a last_rent_increase_date
  const { data: properties } = await supabase
    .from('properties')
    .select('id, user_id, address, last_rent_increase_date, current_rent')
    .eq('ab1482_subject', true)
    .not('last_rent_increase_date', 'is', null);

  if (!properties || properties.length === 0) {
    return NextResponse.json({ message: 'No properties to check', sent: 0 });
  }

  // Categorize units by 60-day and 30-day windows
  interface Reminder {
    property: typeof properties[0];
    eligibleDate: Date;
    type: '60day' | '30day';
  }

  const reminders: Reminder[] = [];

  for (const prop of properties) {
    const eligibleDate = addMonths(prop.last_rent_increase_date, 12);
    const daysUntilEligible = Math.round((eligibleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilEligible === 60) {
      reminders.push({ property: prop, eligibleDate, type: '60day' });
    } else if (daysUntilEligible === 30) {
      reminders.push({ property: prop, eligibleDate, type: '30day' });
    }
  }

  if (reminders.length === 0) {
    return NextResponse.json({ message: 'No reminders to send today', sent: 0 });
  }

  // For 30-day reminders, check if a calc was saved after the 60-day reminder
  // (indicating the user already acted on it)
  const thirtyDayReminders: Reminder[] = [];
  for (const r of reminders) {
    if (r.type === '30day') {
      const sixtyDayReminderDate = toISO(addDays(today, -30)); // 30 days ago was the 60-day mark
      const { data: recentCalcs } = await supabase
        .from('compliance_calculations')
        .select('id')
        .eq('property_id', r.property.id)
        .gte('created_at', sixtyDayReminderDate)
        .limit(1);

      if (recentCalcs && recentCalcs.length > 0) {
        // User already acted, skip 30-day reminder
        continue;
      }
      thirtyDayReminders.push(r);
    }
  }

  const allReminders = [
    ...reminders.filter(r => r.type === '60day'),
    ...thirtyDayReminders,
  ];

  // Group by user
  const byUser: Record<string, Reminder[]> = {};
  for (const r of allReminders) {
    const uid = r.property.user_id;
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(r);
  }

  let emailsSent = 0;
  const errors: string[] = [];

  for (const [userId, userReminders] of Object.entries(byUser)) {
    // Check if user has compliance notifications enabled
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, notify_compliance')
      .eq('id', userId)
      .single();

    if (!profile || !profile.notify_compliance || !profile.email) continue;

    // Send one email per reminder to keep subjects specific
    for (const reminder of userReminders) {
      const address = reminder.property.address || 'your property';
      const eligDateStr = formatDate(reminder.eligibleDate);
      const is60 = reminder.type === '60day';

      const subject = is60
        ? `You can increase rent on ${address} starting ${eligDateStr}`
        : `Reminder: ${address} rent increase eligible in 30 days`;

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#F0F4FF;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border:1px solid #E0E6F0;border-radius:12px;padding:28px;">
      <div style="font-size:18px;font-weight:700;color:#0F3460;margin-bottom:8px;">
        ${is60 ? 'Rent Increase Window Opening' : 'Rent Increase Reminder'}
      </div>
      <p style="font-size:14px;color:#4A5068;line-height:1.6;margin:0 0 16px;">
        ${is60
          ? `Your property <strong>${address}</strong> will be eligible for a rent increase starting <strong>${eligDateStr}</strong> (12 months since the last increase).`
          : `This is a reminder that <strong>${address}</strong> becomes eligible for a rent increase in <strong>30 days</strong> on <strong>${eligDateStr}</strong>.`
        }
      </p>
      ${reminder.property.current_rent ? `
      <div style="background:#E0FAF5;border:1px solid #00D4AA44;border-radius:8px;padding:14px;margin-bottom:16px;">
        <div style="font-size:12px;color:#00A886;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Current Rent</div>
        <div style="font-size:24px;font-weight:800;color:#0F3460;">$${reminder.property.current_rent.toLocaleString()}/mo</div>
      </div>
      ` : ''}
      <p style="font-size:13px;color:#8892A4;margin:0 0 16px;">
        Under AB 1482, you must give at least 30 days written notice before increasing rent.
        Use the Keywise calculator to determine your maximum allowable increase.
      </p>
      <a href="https://keywise.app/tools/ca/ab1482-calculator" style="display:inline-block;background:#0F3460;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">Calculate maximum rent &rarr;</a>
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
          console.error('[increase-window-check] Resend error:', emailError);
          errors.push(`${profile.email}: ${emailError.message}`);
        } else {
          emailsSent++;
        }
      } catch (err: any) {
        console.error('[increase-window-check] Email send failed:', err.message);
        errors.push(`${profile.email}: ${err.message}`);
      }
    }
  }

  return NextResponse.json({
    message: 'Increase window check complete',
    sent: emailsSent,
    checked: properties.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
