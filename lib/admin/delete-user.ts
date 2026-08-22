import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

/**
 * Cascading delete of a user's entire account: payments, documents, maintenance,
 * expenses, leases, properties, buildings, signing_tokens, profile row, Stripe
 * subscriptions, and the Supabase auth user itself.
 *
 * Extracted from app/api/delete-account/route.ts so both the self-service
 * delete-account endpoint and the admin delete-user endpoint share one
 * implementation. `supabase` must be a service-role client — this bypasses RLS.
 */
export async function deleteUserCompletely(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch profile first to get stripe_customer_id before deletion
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    // 1. signing_tokens — keyed by lease_id, not user_id directly
    const { data: userLeases } = await supabase
      .from('leases')
      .select('id')
      .eq('user_id', userId);

    if (userLeases && userLeases.length > 0) {
      const leaseIds = userLeases.map(l => l.id);
      const { error } = await supabase
        .from('signing_tokens')
        .delete()
        .in('lease_id', leaseIds);
      if (error) console.error('[delete-account] signing_tokens:', error.message);
    }

    // 2–8. Tables keyed by user_id
    const tables = ['payments', 'documents', 'maintenance', 'expenses', 'leases', 'properties', 'buildings'];
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (error) console.error(`[delete-account] ${table}:`, error.message);
    }

    // 9. profiles
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
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
          }
        }
      } catch (stripeErr: any) {
        console.error('[delete-account] Stripe cancellation error:', stripeErr.message);
        // Don't abort — proceed with auth deletion
      }
    }

    // 11. Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('[delete-account] Auth delete error:', authError.message);
      return { success: false, error: 'Failed to delete auth user: ' + authError.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[delete-account] Unexpected error:', err.message);
    return { success: false, error: err.message || 'Failed to delete account.' };
  }
}
