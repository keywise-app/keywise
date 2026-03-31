import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('[invite-tenant] SUPABASE_SERVICE_ROLE_KEY is not set — admin methods will fail');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { lease_id, tenant_email, tenant_name } = await req.json();

    if (!lease_id || !tenant_email) {
      return NextResponse.json({ error: 'lease_id and tenant_email are required' }, { status: 400 });
    }

    console.log('[invite-tenant] Generating magic link for', tenant_email);

    // generateLink works for both new and existing users
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: tenant_email,
      options: {
        redirectTo: 'https://keywise.app/?tenant=true',
      },
    });

    if (error) {
      console.error('[invite-tenant] generateLink error:', error.message, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const magicLink = data.properties?.action_link;
    console.log('[invite-tenant] Magic link generated for', tenant_email);

    // Fetch the tenant's phone from the lease record
    const { data: lease } = await supabase
      .from('leases')
      .select('phone')
      .eq('id', lease_id)
      .single();

    let sentSms = false;
    let sentToPhone: string | null = null;

    if (lease?.phone && magicLink) {
      try {
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        const formatted = lease.phone.startsWith('+') ? lease.phone : '+1' + lease.phone.replace(/\D/g, '');
        await twilioClient.messages.create({
          body: `Hi ${tenant_name || 'there'}! Your landlord has invited you to Keywise to manage your lease and pay rent online. Tap here to get started: ${magicLink}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formatted,
        });
        sentSms = true;
        sentToPhone = formatted;
        console.log('[invite-tenant] SMS sent to', formatted);
      } catch (smsErr: any) {
        console.error('[invite-tenant] SMS failed:', smsErr.message);
      }
    }

    // Mark the lease as invited
    const { error: updateError } = await supabase
      .from('leases')
      .update({
        invite_sent: true,
        invite_sent_at: new Date().toISOString(),
      })
      .eq('id', lease_id);

    if (updateError) {
      console.error('[invite-tenant] lease update error:', updateError.message);
    }

    return NextResponse.json({
      success: true,
      magic_link: magicLink,
      sent_sms: sentSms,
      phone: sentToPhone,
    });
  } catch (err: any) {
    console.error('[invite-tenant] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate invite link.' }, { status: 500 });
  }
}
