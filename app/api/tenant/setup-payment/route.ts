import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { tenant_email, tenant_name, lease_id, payment_type, mode } = await req.json();

    if (!tenant_email || !lease_id) {
      return NextResponse.json({ error: 'tenant_email and lease_id are required' }, { status: 400 });
    }

    // Find or create Stripe customer for tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id')
      .eq('email', tenant_email)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Validate existing customer (may be from test mode)
    if (customerId) {
      try { await stripe.customers.retrieve(customerId); }
      catch { customerId = undefined; }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant_email,
        name: tenant_name || tenant_email,
        metadata: { lease_id, role: 'tenant' },
      });
      customerId = customer.id;
      if (profile?.id) {
        await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', profile.id);
      }
    }

    // For card updates, use a new checkout session (Stripe billing portal requires subscription)
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      currency: 'usd',
      customer: customerId,
      payment_method_types: ['card'],
      success_url: `https://keywise.app/?setup_success=true&payment_type=${payment_type || 'manual'}&lease_id=${lease_id}&customer_id=${customerId}`,
      cancel_url: 'https://keywise.app/',
      metadata: { lease_id, tenant_email, payment_type: payment_type || 'manual' },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err: any) {
    console.error('[setup-payment] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to set up payment' }, { status: 500 });
  }
}
