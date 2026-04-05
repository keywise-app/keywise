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
    const { tenant_email, tenant_name, lease_id, landlord_stripe_account_id, payment_type } = await req.json();

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

    // Create SetupIntent for saving payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { lease_id, tenant_email, payment_type: payment_type || 'manual' },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
    });
  } catch (err: any) {
    console.error('[setup-payment] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to set up payment' }, { status: 500 });
  }
}
