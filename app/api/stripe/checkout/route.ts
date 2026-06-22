import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' });

const PRICE_IDS: Record<string, string | undefined> = {
  monthly:  process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
  annual:   process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  founding: process.env.STRIPE_PRO_FOUNDING_PRICE_ID,
};

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { user_id, email, name, return_path, plan } = await req.json();

    if (!user_id || !email) {
      return NextResponse.json({ error: 'user_id and email are required' }, { status: 400 });
    }

    const selectedPlan = plan || 'monthly';
    const priceId = PRICE_IDS[selectedPlan];

    if (!priceId) {
      return NextResponse.json({ error: 'Stripe not configured for plan: ' + selectedPlan }, { status: 500 });
    }

    // Founding member eligibility check
    if (selectedPlan === 'founding') {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_founding_member', true)
        .eq('founding_member_continuous', true);
      if ((count ?? 0) >= 100) {
        return NextResponse.json({ error: 'Founding member spots are full.' }, { status: 409 });
      }
    }

    // Reuse existing Stripe customer if one exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .single();

    let customerId = profile?.stripe_customer_id as string | undefined;

    if (customerId) {
      try { await stripe.customers.retrieve(customerId); }
      catch { customerId = undefined; }
    }

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
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { user_id, plan: selectedPlan },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err: any) {
    console.error('[checkout] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to create checkout session.' }, { status: 500 });
  }
}
