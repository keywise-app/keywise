import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PLATFORM_FEE_CENTS = parseInt(process.env.KEYWISE_PLATFORM_FEE || '200', 10);

export async function POST(req: Request) {
  try {
    const { lease_id, tenant_name, property, amount, due_date, landlord_user_id } = await req.json();

    if (!amount || !tenant_name) {
      return NextResponse.json({ error: 'amount and tenant_name are required' }, { status: 400 });
    }

    const amountCents = Math.round(Number(amount) * 100);
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'amount must be greater than zero' }, { status: 400 });
    }

    // Look up the landlord's connected Stripe account — required for platform fee flow
    let stripeAccountId: string | undefined;
    if (landlord_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', landlord_user_id)
        .single();
      stripeAccountId = profile?.stripe_account_id || undefined;
    }

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Landlord has not connected a Stripe account. Go to Settings → Payments to connect Stripe.' }, { status: 400 });
    }

    const productName = `Rent — ${tenant_name}${property ? ', ' + property.split(',')[0] : ''}${due_date ? ' (due ' + due_date + ')' : ''}`;

    // Create the price on the platform account (not the connected account),
    // so we can use transfer_data + application_fee_amount on the Payment Link.
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: amountCents,
      product_data: {
        name: productName,
        metadata: {
          lease_id: lease_id || '',
          tenant_name,
          property: property || '',
          due_date: due_date || '',
        },
      },
    });

    // Create the Payment Link with platform fee and transfer to the connected account
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      application_fee_amount: PLATFORM_FEE_CENTS,
      transfer_data: { destination: stripeAccountId },
      metadata: {
        lease_id: lease_id || '',
        tenant_name,
        property: property || '',
        due_date: due_date || '',
        landlord_user_id: landlord_user_id || '',
      },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: `Thank you! Your rent payment of $${Number(amount).toLocaleString()} has been received.`,
        },
      },
    });

    return NextResponse.json({
      url: paymentLink.url,
      payment_link_id: paymentLink.id,
      platform_fee_cents: PLATFORM_FEE_CENTS,
    });
  } catch (err: any) {
    console.error('Stripe Payment Link error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create payment link.' }, { status: 500 });
  }
}
