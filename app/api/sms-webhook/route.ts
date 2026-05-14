import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

// Twilio inbound SMS webhook. Mirrors carrier-level STOP into our own consent state
// so /api/send-sms refuses future sends even if Twilio's filter is bypassed.
//
// Configure in Twilio: Phone Number → Messaging → A MESSAGE COMES IN →
//   Webhook: https://keywise.app/api/sms-webhook  (HTTP POST)

const STOP_WORDS  = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'END', 'OPTOUT', 'OPT-OUT'];
const START_WORDS = ['START', 'UNSTOP', 'YES', 'OPTIN', 'OPT-IN'];
const HELP_WORDS  = ['HELP', 'INFO'];

// CTIA-compliant confirmation replies. Sent directly from the webhook so they work
// regardless of A2P campaign approval state.
const STOP_REPLY  = 'You have been unsubscribed from Keywise messages. No more messages will be sent. Reply START to resubscribe.';
const START_REPLY = 'You have been resubscribed to Keywise messages. Reply HELP for help, STOP to unsubscribe. Msg & data rates may apply.';
const HELP_REPLY  = 'Keywise: For support, email support@keywise.app or visit keywise.app/contact. Reply STOP to unsubscribe. Msg & data rates may apply.';

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith('+')) return '+' + raw.replace(/[^\d]/g, '');
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return digits.length > 0 ? '+' + digits : null;
}

function twiml(reply: string | null = null) {
  const body = reply
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'text/xml' } });
}

export async function POST(req: Request) {
  try {
    // Verify the request is actually from Twilio.
    const sigHeader   = req.headers.get('x-twilio-signature') || '';
    const authToken   = process.env.TWILIO_AUTH_TOKEN || '';
    const url         = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/sms-webhook`
      : req.url;

    const rawBody = await req.text();
    const params: Record<string, string> = {};
    new URLSearchParams(rawBody).forEach((v, k) => { params[k] = v; });

    if (authToken && sigHeader) {
      const ok = twilio.validateRequest(authToken, sigHeader, url, params);
      if (!ok) {
        console.error('[sms-webhook] invalid Twilio signature');
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    const from = normalizePhone(params.From);
    const body = (params.Body || '').trim().toUpperCase();
    if (!from) return twiml();

    const isStop  = STOP_WORDS.includes(body);
    const isStart = START_WORDS.includes(body);
    const isHelp  = HELP_WORDS.includes(body);
    if (!isStop && !isStart && !isHelp) return twiml();  // Twilio sends Delivery receipts, etc.

    // HELP doesn't change consent state — just reply with support info.
    if (isHelp) return twiml(HELP_REPLY);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Match all leases that have this phone (a person could be on multiple leases).
    const { data: leases } = await supabase
      .from('leases')
      .select('id, phone')
      .not('phone', 'is', null);

    const matched = (leases || []).filter(l => normalizePhone(l.phone) === from);
    if (matched.length === 0) {
      // Still reply to STOP so the user gets confirmation even if their number isn't in our DB.
      console.error('[sms-webhook] no lease matched phone:', from);
      if (isStop)  return twiml(STOP_REPLY);
      if (isStart) return twiml(START_REPLY);
      return twiml();
    }

    const now = new Date().toISOString();
    if (isStop) {
      await supabase
        .from('leases')
        .update({ sms_opted_out_at: now, sms_consent: false })
        .in('id', matched.map(l => l.id));

      await supabase.from('sms_consent_events').insert(matched.map(l => ({
        lease_id: l.id,
        phone:    l.phone,
        event_type: 'opt_out',
        source:   'twilio_inbound',
        consent_text: `Inbound STOP keyword: "${params.Body}"`,
      })));

      return twiml(STOP_REPLY);
    }

    if (isStart) {
      // Re-opt-in only flips opt-out timestamp; consent must still have been captured originally.
      await supabase
        .from('leases')
        .update({ sms_opted_out_at: null })
        .in('id', matched.map(l => l.id));

      await supabase.from('sms_consent_events').insert(matched.map(l => ({
        lease_id: l.id,
        phone:    l.phone,
        event_type: 'reconfirm',
        source:   'twilio_inbound',
        consent_text: `Inbound START keyword: "${params.Body}"`,
      })));

      return twiml(START_REPLY);
    }

    return twiml();
  } catch (err: any) {
    console.error('[sms-webhook] error:', err.message);
    return twiml();
  }
}
