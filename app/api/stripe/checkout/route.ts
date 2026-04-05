import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' });

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { user_id, email, name, return_path } = await req.json();

    if (!user_id || !email) {
      return NextResponse.json({ error: 'user_id and email are required' }, { status: 400 });
    }

    if (!process.env.STRIPE_PRO_PRICE_ID) {
      return NextResponse.json({ error: 'Stripe not configured.' }, { status: 500 });
    }

    // Reuse existing Stripe customer if one exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .single();

    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, name: name || email });
      customerId = customer.id;
      await supabase.from('profiles').upsert({ id: user_id, stripe_customer_id: customerId }, { onConflict: 'id' });
    }

    const successUrl = `https://keywise.app/?page=${return_path ?? 'portfolio'}&upgraded=true`;
    const cancelUrl  = `https://keywise.app/?page=${return_path ?? 'portfolio'}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err: any) {
    console.error('[checkout] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to create checkout session.' }, { status: 500 });
  }
}
