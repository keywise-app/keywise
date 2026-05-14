import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

// Phone normalizer matches the format used elsewhere in the app (E.164, US default).
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith('+')) return '+' + raw.replace(/[^\d]/g, '');
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return digits.length > 0 ? '+' + digits : null;
}

/**
 * SMS dispatch.
 *
 * Two recipient roles:
 *   - to_role: 'tenant'   (default) — A2P 10DLC opt-in required. Looks up the lease,
 *     verifies sms_consent, opt-out state, and that `to` matches lease.phone.
 *   - to_role: 'landlord' — sender is the tenant. Account-holder transactional, not
 *     A2P-gated. Verifies that `to` matches the lease's owner profile.phone.
 *
 * `lease_id` is required in both modes so we always have an audit anchor.
 */
export async function POST(req: Request) {
  try {
    const { to, message, lease_id, to_role } = await req.json();
    const role: 'tenant' | 'landlord' = to_role === 'landlord' ? 'landlord' : 'tenant';

    if (!to)        return NextResponse.json({ error: 'No phone number provided.' }, { status: 400 });
    if (!message)   return NextResponse.json({ error: 'No message provided.' },     { status: 400 });
    if (!lease_id)  return NextResponse.json({ error: 'lease_id is required.', code: 'LEASE_ID_REQUIRED' }, { status: 400 });

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return NextResponse.json({ error: 'SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.' }, { status: 503 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: lease, error: leaseErr } = await supabase
      .from('leases')
      .select('id, phone, user_id, sms_consent, sms_opted_out_at')
      .eq('id', lease_id)
      .single();

    if (leaseErr || !lease) {
      console.error('[send-sms] lease lookup failed:', leaseErr?.message, '| lease_id:', lease_id);
      return NextResponse.json({ error: 'Lease not found.', code: 'LEASE_NOT_FOUND' }, { status: 404 });
    }

    const requestedTo = normalizePhone(to);
    if (!requestedTo) {
      return NextResponse.json({ error: 'Invalid recipient phone.', code: 'BAD_PHONE' }, { status: 400 });
    }

    if (role === 'tenant') {
      // A2P 10DLC consent gate.
      if (lease.sms_opted_out_at) {
        console.error('[send-sms] blocked — opted out:', lease_id);
        return NextResponse.json({ error: 'Recipient has opted out of SMS.', code: 'OPTED_OUT' }, { status: 403 });
      }
      if (!lease.sms_consent) {
        console.error('[send-sms] blocked — no consent:', lease_id);
        return NextResponse.json({ error: 'No SMS consent on file for this tenant.', code: 'NO_CONSENT' }, { status: 403 });
      }
      const consentedTo = normalizePhone(lease.phone);
      if (!consentedTo || requestedTo !== consentedTo) {
        console.error('[send-sms] blocked — phone mismatch | requested:', requestedTo, '| consented:', consentedTo);
        return NextResponse.json({ error: 'Recipient phone does not match the consented number on file.', code: 'PHONE_MISMATCH' }, { status: 403 });
      }
    } else {
      // Landlord recipient — tenant-initiated. Verify `to` matches the lease owner's profile phone.
      const { data: landlord } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', lease.user_id)
        .single();

      const landlordPhone = normalizePhone(landlord?.phone);
      if (!landlordPhone || landlordPhone !== requestedTo) {
        console.error('[send-sms] blocked — landlord phone mismatch | requested:', requestedTo, '| landlord:', landlordPhone);
        return NextResponse.json({ error: 'Recipient phone does not match the landlord on file.', code: 'PHONE_MISMATCH' }, { status: 403 });
      }
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: requestedTo,
    });

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (err: any) {
    console.error('[send-sms] Twilio error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to send SMS.' }, { status: 500 });
  }
}
