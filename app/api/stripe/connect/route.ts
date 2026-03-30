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

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Create a new Express connected account
    const account = await stripe.accounts.create({
      type: 'express',
      metadata: { user_id },
    });

    // Save the account ID to the profiles table before redirecting.
    // upsert handles both the case where the row exists and where it doesn't.
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({ id: user_id, stripe_account_id: account.id }, { onConflict: 'id' });

    if (dbError) {
      console.error('Failed to save stripe_account_id to profiles:', dbError.message);
      return NextResponse.json({ error: 'Stripe account created but could not be saved: ' + dbError.message }, { status: 500 });
    }

    // Create the onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://keywise.app/?page=settings',
      return_url: 'https://keywise.app/?page=settings&stripe=connected',
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url, account_id: account.id });
  } catch (err: any) {
    console.error('Stripe Connect error:', err);
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
    console.error('Stripe account retrieve error:', err);
    return NextResponse.json({ error: err.message || 'Failed to retrieve account.' }, { status: 500 });
  }
}
