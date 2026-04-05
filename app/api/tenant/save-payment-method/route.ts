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
    const { user_id, customer_id, autopay_enabled } = await req.json();

    if (!user_id || !customer_id) {
      return NextResponse.json({ error: 'user_id and customer_id required' }, { status: 400 });
    }

    // Get the latest payment method from Stripe customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer_id,
      type: 'card',
    });

    const defaultPM = paymentMethods.data[0];

    const { error } = await supabase.from('profiles').update({
      stripe_customer_id: customer_id,
      stripe_payment_method_id: defaultPM?.id || null,
      autopay_enabled: autopay_enabled || false,
    }).eq('id', user_id);

    if (error) {
      console.error('[save-payment-method] Update error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, payment_method_id: defaultPM?.id });
  } catch (err: any) {
    console.error('[save-payment-method] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
