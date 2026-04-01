import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

console.log('[subscribe] STRIPE_PRO_PRICE_ID:', process.env.STRIPE_PRO_PRICE_ID?.slice(0, 20));
console.log('[subscribe] STRIPE_SECRET_KEY set:', !!process.env.STRIPE_SECRET_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { user_id, email, name } = await req.json();

    if (!user_id || !email) {
      return NextResponse.json({ error: 'user_id and email are required' }, { status: 400 });
    }

    if (!process.env.STRIPE_PRO_PRICE_ID) {
      console.error('[subscribe] STRIPE_PRO_PRICE_ID not set');
      return NextResponse.json({ error: 'Stripe not configured. Please contact support.' }, { status: 500 });
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({ email, name: name || email });
    console.log('[subscribe] Created Stripe customer:', customer.id, 'for', email);

    // Create subscription with 14-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRO_PRICE_ID }],
      trial_period_days: 14,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : new Date(Date.now() + 14 * 86400000).toISOString();

    // Save to profiles
    const { error: dbError } = await supabase.from('profiles').upsert({
      id: user_id,
      stripe_customer_id: customer.id,
      subscription_status: subscription.status,
      trial_ends_at: trialEnd,
    }, { onConflict: 'id' });

    if (dbError) {
      console.error('[subscribe] Profile update error:', dbError.message);
    }

    const latestInvoice = subscription.latest_invoice as Stripe.Invoice & {
      payment_intent: Stripe.PaymentIntent | null;
    } | null;

    const clientSecret = latestInvoice?.payment_intent?.client_secret ?? null;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      trialEndsAt: trialEnd,
    });
  } catch (err: any) {
    console.error('[subscribe] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to create subscription.' }, { status: 500 });
  }
}
