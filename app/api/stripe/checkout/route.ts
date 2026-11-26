import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { workspaceAccess, apiError } from '@/lib/workspace/access';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' });

const PRICE_IDS: Record<string, string | undefined> = {
  monthly:  process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
  annual:   process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  founding: process.env.STRIPE_PRO_FOUNDING_PRICE_ID,
};
const EXPECTED_PRICES: Record<string, { amount: number; interval: 'month' | 'year' }> = {
  monthly: { amount: 4900, interval: 'month' },
  annual: { amount: 39000, interval: 'year' },
  founding: { amount: 2900, interval: 'month' },
};

export async function POST(req: Request) {
  try {
    const {db:supabase,user}=await workspaceAccess(req);
    const {plan,return_path}=await req.json();
    const user_id=user.id,email=user.email,name=user.user_metadata?.full_name || '';
    if(!email)throw new Response('A verified account email is required.',{status:409});
    const selectedPlan = plan || 'monthly';
    if (!Object.prototype.hasOwnProperty.call(PRICE_IDS, selectedPlan)) {
      return NextResponse.json({ error: 'Choose a valid plan.' }, { status: 400 });
    }
    const priceId = PRICE_IDS[selectedPlan];

    if (!priceId) {
      return NextResponse.json({ error: 'Stripe not configured for plan: ' + selectedPlan }, { status: 500 });
    }
    const price = await stripe.prices.retrieve(priceId);
    const expected = EXPECTED_PRICES[selectedPlan];
    if (!price.active || price.currency !== 'usd' || price.unit_amount !== expected.amount || price.recurring?.interval !== expected.interval || price.recurring?.interval_count !== 1) {
      return NextResponse.json({ error: 'This plan is temporarily unavailable. Please contact support.' }, { status: 503 });
    }

    // Founding member eligibility check
    if (selectedPlan === 'founding') {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_founding_member', true);
      if (error || count === null) {
        return NextResponse.json({ error: 'Founding offer availability is temporarily unavailable.' }, { status: 503 });
      }
      if (count >= 100) {
        return NextResponse.json({ error: 'Founding member spots are full.' }, { status: 409 });
      }
    }

    // Reuse existing Stripe customer if one exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status, is_founding_member')
      .eq('id', user_id)
      .single();
    if (profileError || !profile) throw new Response('Account billing status is unavailable.', { status: 503 });
    if (profile.subscription_status === 'active' || profile.subscription_status === 'trialing') {
      return NextResponse.json({ error: 'You already have a Pro subscription. Manage it in account settings.' }, { status: 409 });
    }
    if (selectedPlan === 'founding' && profile.is_founding_member) {
      return NextResponse.json({ error: 'The founding rate cannot be reclaimed after cancellation.' }, { status: 409 });
    }

    let customerId = profile?.stripe_customer_id as string | undefined;

    if (customerId) {
      try { await stripe.customers.retrieve(customerId); }
      catch { customerId = undefined; }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({ email, name: name || email },{idempotencyKey:`workspace-customer-${user_id}`});
      customerId = customer.id;
      const {error:saveError}=await supabase.from('profiles').update({stripe_customer_id:customerId}).eq('id',user_id);
      if(saveError)throw new Response('Unable to save checkout setup.',{status:503});
    }

    const successUrl = `https://keywise.app/?page=${['portfolio','settings'].includes(return_path)?return_path:'portfolio'}&upgraded=true`;
    const cancelUrl  = `https://keywise.app/?page=${['portfolio','settings'].includes(return_path)?return_path:'portfolio'}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_collection: 'always',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 14 },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { user_id, plan: selectedPlan },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {return apiError(error);}
}
