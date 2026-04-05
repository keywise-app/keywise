import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req: Request) {
  try {
    const { to, message } = await req.json();

    if (!to) {
      return NextResponse.json({ error: 'No phone number provided.' }, { status: 400 });
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return NextResponse.json({ error: 'SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.' }, { status: 503 });
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const formatted = to.startsWith('+') ? to : '+1' + to.replace(/\D/g, '');

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formatted,
    });

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (err: any) {
    console.error('[send-sms] Twilio error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to send SMS.' }, { status: 500 });
  }
}