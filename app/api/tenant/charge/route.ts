import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const PLATFORM_FEE_CENTS = parseInt(process.env.KEYWISE_PLATFORM_FEE || '200', 10);

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { payment_id, customer_id, payment_method_id, amount, landlord_stripe_account_id } = await req.json();

    if (!payment_id || !customer_id || !payment_method_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amountCents = Math.round(amount * 100);
    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: 'usd',
      customer: customer_id,
      payment_method: payment_method_id,
      off_session: true,
      confirm: true,
    };

    // If landlord has connected Stripe, route payment to them
    if (landlord_stripe_account_id) {
      intentParams.application_fee_amount = PLATFORM_FEE_CENTS;
      intentParams.transfer_data = { destination: landlord_stripe_account_id };
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    if (paymentIntent.status === 'succeeded') {
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('payments').update({
        status: 'paid',
        paid_date: today,
        method: 'Auto-Pay (Stripe)',
      }).eq('id', payment_id);

      return NextResponse.json({ success: true, payment_intent_id: paymentIntent.id });
    }

    return NextResponse.json({ error: 'Payment not completed: ' + paymentIntent.status }, { status: 400 });
  } catch (err: any) {
    console.error('[tenant/charge] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Payment failed' }, { status: 500 });
  }
}
