import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Webhook handler must use service-role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { lease_id, tenant_name, due_date } = intent.metadata || {};
    const today = new Date().toISOString().split('T')[0];

    try {
      // Try to match by lease_id + due_date first (most precise)
      if (lease_id && due_date) {
        const { data: existing } = await supabase
          .from('payments')
          .select('id, status')
          .eq('lease_id', lease_id)
          .eq('due_date', due_date)
          .neq('status', 'paid')
          .single();

        if (existing) {
          await supabase
            .from('payments')
            .update({ status: 'paid', paid_date: today, method: 'Stripe' })
            .eq('id', existing.id);
          console.log(`Marked payment ${existing.id} as paid via Stripe (payment_intent: ${intent.id})`);
          return NextResponse.json({ received: true });
        }
      }

      // Fallback: match by tenant_name + due_date
      if (tenant_name && due_date) {
        const { data: existing } = await supabase
          .from('payments')
          .select('id, status')
          .eq('tenant_name', tenant_name)
          .eq('due_date', due_date)
          .neq('status', 'paid')
          .single();

        if (existing) {
          await supabase
            .from('payments')
            .update({ status: 'paid', paid_date: today, method: 'Stripe' })
            .eq('id', existing.id);
          console.log(`Marked payment ${existing.id} as paid via Stripe fallback (payment_intent: ${intent.id})`);
        }
      }
    } catch (err: any) {
      console.error('Error updating payment record:', err.message);
      // Don't return 500 — Stripe retries on non-2xx, we don't want a retry loop
    }
  }

  return NextResponse.json({ received: true });
}
