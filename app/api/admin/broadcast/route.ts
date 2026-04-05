import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const TYPE_COLORS: Record<string, string> = {
  announcement: '#0F3460', feature: '#00D4AA', bug: '#FF6B6B', newsletter: '#0F3460', notice: '#FFB347',
};
const TYPE_LABELS: Record<string, string> = {
  announcement: '📣 Announcement', feature: '🚀 New Feature', bug: '🐛 Bug Fix', newsletter: '📰 Newsletter', notice: '⚠️ Important Notice',
};

function buildEmailHtml(type: string, subject: string, message: string) {
  const color = TYPE_COLORS[type] || '#0F3460';
  const label = TYPE_LABELS[type] || '📣 Update';
  return `<html><body style="font-family:Arial,sans-serif;background:#F0F4FF;padding:40px 20px;"><div style="max-width:560px;margin:0 auto;"><div style="background:#0F3460;border-radius:12px 12px 0 0;padding:24px 32px;"><div style="color:#00D4AA;font-size:20px;font-weight:700;">Keywise</div></div><div style="background:white;padding:32px;"><div style="display:inline-block;background:${color}22;color:${color};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:16px;">${label}</div><h1 style="color:#0F3460;font-size:22px;font-weight:700;margin:0 0 16px;">${subject}</h1><div style="color:#4A5068;font-size:15px;line-height:1.7;">${message.replace(/\n/g, '<br/>')}</div><div style="margin-top:32px;padding-top:24px;border-top:1px solid #E0E6F0;"><a href="https://keywise.app" style="display:inline-block;background:#0F3460;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Open Keywise →</a></div></div><div style="background:#F8FAFF;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;"><p style="color:#8892A4;font-size:12px;margin:0;">You're receiving this as a Keywise user.<br/><a href="https://keywise.app/?page=settings" style="color:#8892A4;">Manage email preferences</a></p></div></div></body></html>`;
}

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { password, subject, message, type, recipient_filter, specific_email } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Access denied' }, { status: 401 });
    }

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    // Fetch recipients based on filter
    let query = supabase.from('profiles').select('email, notify_product_updates');

    if (recipient_filter === 'pro') {
      query = query.eq('subscription_status', 'active');
    } else if (recipient_filter === 'trial') {
      query = query.or('subscription_status.is.null,subscription_status.eq.trialing,subscription_status.eq.free');
    } else if (recipient_filter === 'specific' && specific_email) {
      return await sendSingle(resend, supabase, specific_email, subject, message, type);
    }
    // 'all' — no filter needed

    const { data: profiles, error: fetchErr } = await query;
    if (fetchErr) {
      return NextResponse.json({ error: 'Failed to fetch recipients: ' + fetchErr.message }, { status: 500 });
    }

    // Filter out unsubscribed users and those without email
    const recipients = (profiles || [])
      .filter(p => p.email && p.notify_product_updates !== false)
      .map(p => p.email as string);

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
    }

    const html = buildEmailHtml(type || 'announcement', subject, message);

    // Send in batches of 50
    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      try {
        const results = await Promise.allSettled(
          batch.map(email =>
            resend.emails.send({
              from: 'Chris at Keywise <chris@keywise.app>',
              to: email,
              subject,
              html,
            })
          )
        );
        sentCount += results.filter(r => r.status === 'fulfilled').length;
        failedCount += results.filter(r => r.status === 'rejected').length;
      } catch {
        failedCount += batch.length;
      }
    }

    // Log broadcast
    await supabase.from('broadcasts').insert({
      subject, message, type: type || 'announcement',
      recipient_filter: recipient_filter || 'all',
      recipient_count: recipients.length,
      sent_count: sentCount,
      failed_count: failedCount,
    });

    return NextResponse.json({ sent: sentCount, failed: failedCount, total: recipients.length });
  } catch (err: any) {
    console.error('[broadcast] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function sendSingle(resend: Resend, supabase: any, email: string, subject: string, message: string, type: string) {
  const html = buildEmailHtml(type || 'announcement', subject, message);
  try {
    await resend.emails.send({ from: 'Chris at Keywise <chris@keywise.app>', to: email, subject, html });
    await supabase.from('broadcasts').insert({
      subject, message, type: type || 'announcement',
      recipient_filter: 'specific', recipient_count: 1, sent_count: 1, failed_count: 0,
    });
    return NextResponse.json({ sent: 1, failed: 0, total: 1 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to send: ' + err.message }, { status: 500 });
  }
}
