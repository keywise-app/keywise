import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { lease_id, tenant_email, tenant_name } = await req.json();

    if (!lease_id || !tenant_email) {
      return NextResponse.json({ error: 'lease_id and tenant_email are required' }, { status: 400 });
    }

    // Generate a magic link that redirects to the tenant portal
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: tenant_email,
      options: {
        redirectTo: 'https://keywise.app/?tenant=true',
      },
    });

    if (linkError) {
      console.error('[invite-tenant] generateLink error:', linkError.message);
      return NextResponse.json({ error: linkError.message }, { status: 500 });
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
      // Don't block — the magic link was sent successfully
    }

    console.log('[invite-tenant] Magic link generated for', tenant_email, '(', tenant_name, ')');

    return NextResponse.json({ success: true, action_link: linkData.properties?.action_link });
  } catch (err: any) {
    console.error('[invite-tenant] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send invite.' }, { status: 500 });
  }
}
