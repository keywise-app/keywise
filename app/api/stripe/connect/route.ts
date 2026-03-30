import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();

    console.log('[stripe/connect] user_id received:', user_id);

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Create a new Express connected account
    const account = await stripe.accounts.create({
      type: 'express',
      metadata: { user_id },
    });

    console.log('[stripe/connect] Stripe account created:', account.id);

    // Save the account ID to the profiles table.
    // upsert handles both missing and existing rows.
    const { data: upsertData, error: dbError } = await supabase
      .from('profiles')
      .upsert({ id: user_id, stripe_account_id: account.id }, { onConflict: 'id' })
      .select('id, stripe_account_id');

    console.log('[stripe/connect] Supabase upsert result — data:', upsertData, 'error:', dbError);

    if (dbError) {
      console.error('[stripe/connect] Failed to save stripe_account_id:', dbError.message, dbError.code, dbError.details);
      // Don't block the flow — pass the account_id back so the client can save it as a fallback
    }

    // Include account_id in the return_url so the client can save it as a backup
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://keywise.app/?page=settings',
      return_url: `https://keywise.app/?page=settings&stripe=connected&account_id=${account.id}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url, account_id: account.id });
  } catch (err: any) {
    console.error('[stripe/connect] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create Stripe Connect link.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const account_id = searchParams.get('account_id');

    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    const account = await stripe.accounts.retrieve(account_id);
    return NextResponse.json({
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });
  } catch (err: any) {
    console.error('[stripe/connect] Account retrieve error:', err);
    return NextResponse.json({ error: err.message || 'Failed to retrieve account.' }, { status: 500 });
  }
}
