import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    console.log('[invite-tenant] Sending invite to', tenant_email, 'for lease', lease_id);

    // Try inviteUserByEmail first (works for new users, sends invite email)
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(tenant_email, {
      redirectTo: 'https://keywise.app/?tenant=true',
      data: { role: 'tenant', lease_id, tenant_name },
    });

    if (error) {
      const alreadyExists =
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already been registered') ||
        error.message.toLowerCase().includes('user already exists');

      if (alreadyExists) {
        // Existing user — send a magic link OTP email instead
        console.log('[invite-tenant] User already exists, sending magic link OTP to', tenant_email);
        const anonClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { error: otpError } = await anonClient.auth.signInWithOtp({
          email: tenant_email,
          options: {
            emailRedirectTo: 'https://keywise.app/?tenant=true',
            shouldCreateUser: false,
          },
        });
        if (otpError) {
          console.error('[invite-tenant] signInWithOtp error:', otpError.message, otpError);
          return NextResponse.json({ error: otpError.message }, { status: 500 });
        }
        console.log('[invite-tenant] Magic link OTP sent to existing user', tenant_email);
      } else {
        console.error('[invite-tenant] inviteUserByEmail error:', error.message, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      console.log('[invite-tenant] Invite email sent to new user', tenant_email, '— id:', data.user?.id);
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[invite-tenant] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send invite.' }, { status: 500 });
  }
}
