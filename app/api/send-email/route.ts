import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    console.log('[send-email] RESEND_API_KEY set?', !!apiKey, '| first 8 chars:', apiKey ? apiKey.slice(0, 8) : 'MISSING');

    const { to, subject, html, from_name } = await req.json();
    console.log('[send-email] Sending to:', to, '| subject:', subject, '| from_name:', from_name);

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'to, subject, and html are required' }, { status: 400 });
    }

    const from = from_name
      ? `${from_name} via Keywise <noreply@keywise.app>`
      : 'Keywise <noreply@keywise.app>';

    console.log('[send-email] From:', from);

    const { data, error } = await resend.emails.send({ from, to, subject, html });

    console.log('[send-email] Resend response — data:', JSON.stringify(data), '| error:', JSON.stringify(error));

    if (error) {
      console.error('[send-email] Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[send-email] Success, id:', data?.id);
    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error('[send-email] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send email.' }, { status: 500 });
  }
}
