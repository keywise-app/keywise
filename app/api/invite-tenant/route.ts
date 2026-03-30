import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    console.log('[invite-tenant] Sending invite to', tenant_email, 'for lease', lease_id);

    // inviteUserByEmail sends the magic link email via Supabase's email system
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(tenant_email, {
      redirectTo: 'https://keywise.app/?tenant=true',
      data: {
        role: 'tenant',
        lease_id,
        tenant_name,
      },
    });

    if (error) {
      console.error('[invite-tenant] inviteUserByEmail error:', error.message, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[invite-tenant] Invite email sent successfully to', tenant_email, '— user id:', data.user?.id);

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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[invite-tenant] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send invite.' }, { status: 500 });
  }
}
