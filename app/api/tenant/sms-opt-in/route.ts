import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Tenant-initiated SMS opt-in / opt-out.
// Strongest A2P 10DLC consent artifact — opt-in comes directly from the recipient.
//
// Auth model matches /api/tenant-lease: caller passes lease_id + email (or user_id);
// we verify the lease's tenant email matches before flipping consent.

const SMS_CONSENT_TEXT = (tenantName: string, landlordName: string) =>
  `I, ${tenantName || 'this tenant'}, consent to receive SMS messages from ${landlordName || 'my landlord'} via Keywise — including rent reminders, lease updates, and other transactional notices. I can reply STOP at any time to opt out. Msg & data rates may apply.`;

export async function POST(req: Request) {
  try {
    const { lease_id, email, user_id, opt_in, source } = await req.json();

    if (!lease_id) return NextResponse.json({ error: 'lease_id is required' }, { status: 400 });
    if (!email && !user_id) return NextResponse.json({ error: 'email or user_id is required' }, { status: 400 });
    if (typeof opt_in !== 'boolean') return NextResponse.json({ error: 'opt_in must be boolean' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: lease, error: leaseErr } = await supabase
      .from('leases')
      .select('id, email, phone, user_id, tenant_user_id, tenant_name')
      .eq('id', lease_id)
      .single();

    if (leaseErr || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }

    // Authorization: caller must be the tenant on this lease.
    const emailMatches  = email && lease.email && lease.email.toLowerCase() === String(email).toLowerCase();
    const userIdMatches = user_id && lease.tenant_user_id === user_id;
    if (!emailMatches && !userIdMatches) {
      console.error('[sms-opt-in] auth mismatch | lease.email:', lease.email, '| caller:', email, '| lease.tenant_user_id:', lease.tenant_user_id, '| caller user_id:', user_id);
      return NextResponse.json({ error: 'Not authorized for this lease' }, { status: 403 });
    }

    if (!lease.phone) {
      return NextResponse.json({ error: 'No phone number on file. Ask your landlord to add one.', code: 'NO_PHONE' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null;
    const ua = req.headers.get('user-agent') || null;
    const now = new Date().toISOString();

    if (opt_in) {
      // Opt in. Clear any prior opt-out timestamp.
      const { error: updateErr } = await supabase
        .from('leases')
        .update({
          sms_consent: true,
          sms_consent_at: now,
          sms_consent_source: source === 'email_link' ? 'tenant_portal_email' : 'tenant_portal',
          sms_consent_ip: ip,
          sms_consent_user_agent: ua,
          sms_opted_out_at: null,
        })
        .eq('id', lease_id);
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

      const { data: landlord } = await supabase
        .from('profiles').select('full_name').eq('id', lease.user_id).single();

      await supabase.from('sms_consent_events').insert({
        lease_id,
        phone: lease.phone,
        event_type: 'opt_in',
        source: source === 'email_link' ? 'tenant_portal_email' : 'tenant_portal',
        ip,
        user_agent: ua,
        consent_text: SMS_CONSENT_TEXT(lease.tenant_name || '', landlord?.full_name || ''),
      });

      return NextResponse.json({ success: true, sms_consent: true });
    }

    // Opt out.
    const { error: updateErr } = await supabase
      .from('leases')
      .update({ sms_consent: false, sms_opted_out_at: now })
      .eq('id', lease_id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await supabase.from('sms_consent_events').insert({
      lease_id,
      phone: lease.phone,
      event_type: 'opt_out',
      source: 'tenant_portal',
      ip,
      user_agent: ua,
      consent_text: 'Tenant opted out via portal preferences toggle.',
    });

    return NextResponse.json({ success: true, sms_consent: false });
  } catch (err: any) {
    console.error('[sms-opt-in] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — return current consent state. Useful for the portal banner.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lease_id = searchParams.get('lease_id');
  const email = searchParams.get('email');
  const user_id = searchParams.get('user_id');

  if (!lease_id) return NextResponse.json({ error: 'lease_id required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: lease } = await supabase
    .from('leases')
    .select('id, email, phone, tenant_user_id, sms_consent, sms_opted_out_at, sms_consent_at, sms_consent_source')
    .eq('id', lease_id)
    .single();

  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  const emailMatches  = email && lease.email && lease.email.toLowerCase() === email.toLowerCase();
  const userIdMatches = user_id && lease.tenant_user_id === user_id;
  if (!emailMatches && !userIdMatches) {
    return NextResponse.json({ error: 'Not authorized for this lease' }, { status: 403 });
  }

  return NextResponse.json({
    sms_consent: !!lease.sms_consent,
    sms_opted_out_at: lease.sms_opted_out_at,
    sms_consent_at: lease.sms_consent_at,
    sms_consent_source: lease.sms_consent_source,
    has_phone: !!lease.phone,
    phone: lease.phone,
  });
}
