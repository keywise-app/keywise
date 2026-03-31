import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  console.log('[test-email] RESEND_API_KEY set?', !!apiKey, '| first 8 chars:', apiKey ? apiKey.slice(0, 8) : 'MISSING');

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set' }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: 'Keywise <noreply@keywise.app>',
    to: 'cccolwell@gmail.com',
    subject: 'Keywise Test',
    html: '<p>This is a test.</p>',
  });

  console.log('[test-email] Resend response — data:', JSON.stringify(data), '| error:', JSON.stringify(error));

  if (error) {
    return NextResponse.json({ error, apiKeyPrefix: apiKey.slice(0, 8) }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data?.id, apiKeyPrefix: apiKey.slice(0, 8) });
}
