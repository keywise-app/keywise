import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { user_id, email, name } = await req.json();

    if (!user_id || !email) {
      return NextResponse.json({ error: 'user_id and email are required' }, { status: 400 });
    }

    if (!process.env.STRIPE_PRO_PRICE_ID) {
      return NextResponse.json({ error: 'Stripe not configured.' }, { status: 500 });
    }

    // Find or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Validate existing customer
    if (customerId) {
      try { await stripe.customers.retrieve(customerId); }
      catch { customerId = undefined; }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({ email, name: name || email });
      customerId = customer.id;
      await supabase.from('profiles').upsert({ id: user_id, stripe_customer_id: customerId }, { onConflict: 'id' });
    }

    // Create Checkout Session for subscription (collects payment upfront)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: `https://keywise.app/?page=settings&upgraded=true`,
      cancel_url: 'https://keywise.app/?page=settings',
      allow_promotion_codes: true,
      metadata: { user_id },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err: any) {
    console.error('[subscribe] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to create subscription.' }, { status: 500 });
  }
}
