import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const rateLimitMap = new Map<string, number[]>();
function isRateLimited(ip: string, limit = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const recent = (rateLimitMap.get(ip) || []).filter(t => now - t < windowMs);
  if (recent.length >= limit) return true;
  rateLimitMap.set(ip, [...recent, now]);
  return false;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'name, email, and message are required' }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: 'Keywise <noreply@keywise.app>',
      to: 'hello@keywise.app',
      replyTo: email,
      subject: `New Keywise contact from ${name}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 0;">
  <h2 style="margin:0 0 24px;font-size:20px;color:#0F3460;">New contact form submission</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #E0E6F0;font-size:13px;color:#8892A4;width:80px;">Name</td>
      <td style="padding:10px 0;border-bottom:1px solid #E0E6F0;font-size:14px;color:#1A1A2E;font-weight:600;">${name}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #E0E6F0;font-size:13px;color:#8892A4;">Email</td>
      <td style="padding:10px 0;border-bottom:1px solid #E0E6F0;font-size:14px;color:#1A1A2E;"><a href="mailto:${email}" style="color:#00A886;">${email}</a></td>
    </tr>
    <tr>
      <td style="padding:16px 0 0;font-size:13px;color:#8892A4;vertical-align:top;">Message</td>
      <td style="padding:16px 0 0;font-size:14px;color:#1A1A2E;line-height:1.7;">${message.replace(/\n/g, '<br>')}</td>
    </tr>
  </table>
  <p style="margin:32px 0 0;font-size:12px;color:#8892A4;">Reply directly to this email to respond to ${name}.</p>
</div>`,
    });

    if (error) {
      console.error('[contact] Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[contact] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send message.' }, { status: 500 });
  }
}
