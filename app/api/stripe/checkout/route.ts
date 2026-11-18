import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { workspaceAccess, apiError } from '@/lib/workspace/access';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' });

const PRICE_IDS: Record<string, string | undefined> = {
  monthly:  process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
  annual:   process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  founding: process.env.STRIPE_PRO_FOUNDING_PRICE_ID,
};

export async function POST(req: Request) {
  try {
    const {db:supabase,user}=await workspaceAccess(req);
    const {plan,return_path}=await req.json();
    const user_id=user.id,email=user.email,name=user.user_metadata?.full_name || '';
    if(!email)throw new Response('A verified account email is required.',{status:409});
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
