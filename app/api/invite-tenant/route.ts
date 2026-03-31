import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('[invite-tenant] SUPABASE_SERVICE_ROLE_KEY is not set — admin methods will fail');
  }

  const adminClient = createClient(
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
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: tenant_email,
      options: {
        redirectTo: 'https://keywise.app/?tenant=true',
      },
    });

    if (linkError) {
      console.error('[invite-tenant] generateLink error:', linkError.message, linkError);
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    const magicLink = linkData.properties?.action_link;
    console.log('[invite-tenant] Magic link generated:', magicLink ? 'yes' : 'no');

    // Fetch the lease to get the tenant's phone number
    const { data: lease } = await adminClient
      .from('leases')
      .select('phone')
      .eq('id', lease_id)
      .single();

    const tenantPhone = lease?.phone;
    let smsSent = false;

    if (tenantPhone && magicLink) {
      // Send the magic link via SMS
      try {
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        const formatted = tenantPhone.startsWith('+') ? tenantPhone : '+1' + tenantPhone.replace(/\D/g, '');
        await twilioClient.messages.create({
          body: `Hi ${tenant_name || 'there'}! Your landlord has invited you to Keywise to manage your lease and pay rent online. Click here to get started: ${magicLink}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formatted,
        });
        smsSent = true;
        console.log('[invite-tenant] SMS sent to', formatted);
      } catch (smsErr: any) {
        console.error('[invite-tenant] SMS send failed:', smsErr.message);
        // Don't block — return the link so the landlord can send it manually
      }
    }

    // Mark the lease as invited
    const { error: updateError } = await adminClient
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
      sms_sent: smsSent,
      // Return the link when no phone so landlord can copy and share manually
      magic_link: smsSent ? null : magicLink,
    });
  } catch (err: any) {
    console.error('[invite-tenant] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate invite link.' }, { status: 500 });
  }
}
