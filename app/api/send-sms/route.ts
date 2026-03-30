import { NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(req: Request) {
  try {
    const { to, message } = await req.json();

    if (!to) {
      return NextResponse.json({ error: 'No phone number provided.' });
    }

    // Format phone number — add +1 if not present
    const formatted = to.startsWith('+') ? to : '+1' + to.replace(/\D/g, '');

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formatted,
    });

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (err: any) {
    console.error('Twilio error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send SMS.' });
  }
}