import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Fetch profile first to get stripe_customer_id before deletion
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .single();

    // 1. signing_tokens — keyed by lease_id, not user_id directly
    const { data: userLeases } = await supabase
      .from('leases')
      .select('id')
      .eq('user_id', user_id);

    if (userLeases && userLeases.length > 0) {
      const leaseIds = userLeases.map(l => l.id);
      const { error } = await supabase
        .from('signing_tokens')
        .delete()
        .in('lease_id', leaseIds);
      if (error) console.error('[delete-account] signing_tokens:', error.message);
      else console.log('[delete-account] Deleted signing_tokens for', leaseIds.length, 'leases');
    }

    // 2–8. Tables keyed by user_id
    const tables = ['payments', 'documents', 'maintenance', 'expenses', 'leases', 'properties', 'buildings'];
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', user_id);
      if (error) console.error(`[delete-account] ${table}:`, error.message);
      else console.log(`[delete-account] Deleted from ${table}`);
    }

    // 9. profiles
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', user_id);
    if (profileError) console.error('[delete-account] profiles:', profileError.message);

    // 10. Cancel Stripe subscription if customer exists
    if (profile?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'all',
          limit: 10,
        });
        for (const sub of subscriptions.data) {
          if (sub.status !== 'canceled') {
            await stripe.subscriptions.cancel(sub.id);
            console.log('[delete-account] Cancelled Stripe subscription', sub.id);
          }
        }
      } catch (stripeErr: any) {
        console.error('[delete-account] Stripe cancellation error:', stripeErr.message);
        // Don't abort — proceed with auth deletion
      }
    }

    // 11. Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id);
    if (authError) {
      console.error('[delete-account] Auth delete error:', authError.message);
      return NextResponse.json({ error: 'Failed to delete auth user: ' + authError.message }, { status: 500 });
    }

    console.log('[delete-account] Successfully deleted user', user_id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[delete-account] Unexpected error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to delete account.' }, { status: 500 });
  }
}
