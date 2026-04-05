import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const today = new Date().toISOString().split('T')[0];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://keywise.app';

  // Find all pending/overdue payments due today or earlier
  const { data: duePayments } = await supabase
    .from('payments')
    .select('*, leases(email, user_id, tenant_user_id)')
    .in('status', ['pending', 'overdue'])
    .lte('due_date', today);

  let charged = 0;
  let failed = 0;
  let skipped = 0;

  for (const payment of duePayments || []) {
    const tenantUserId = payment.leases?.tenant_user_id;
    if (!tenantUserId) { skipped++; continue; }

    const { data: tenantProfile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_payment_method_id, autopay_enabled')
      .eq('id', tenantUserId)
      .single();

    if (!tenantProfile?.autopay_enabled || !tenantProfile?.stripe_payment_method_id) {
      skipped++;
      continue;
    }

    const { data: landlordProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id, email')
      .eq('id', payment.user_id)
      .single();

    if (!landlordProfile?.stripe_account_id) { skipped++; continue; }

    try {
      const intentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(payment.amount * 100),
        currency: 'usd',
        customer: tenantProfile.stripe_customer_id,
        payment_method: tenantProfile.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        application_fee_amount: 200,
        transfer_data: { destination: landlordProfile.stripe_account_id },
        metadata: { payment_id: payment.id, lease_id: payment.lease_id },
      };

      const paymentIntent = await stripe.paymentIntents.create(intentParams);

      if (paymentIntent.status === 'succeeded') {
        await supabase.from('payments').update({
          status: 'paid', paid_date: today, method: 'Auto-Pay (Stripe)',
        }).eq('id', payment.id);
        charged++;

        // Send notifications
        fetch(`${baseUrl}/api/mark-payment-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: payment.id }),
        }).catch(() => {});
      }
    } catch (err: any) {
      failed++;
      console.error('[autopay] Charge failed:', payment.id, err.message);

      // Notify tenant
      const tenantEmail = payment.leases?.email;
      if (tenantEmail) {
        fetch(`${baseUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: tenantEmail,
            subject: 'Auto-pay failed — action required',
            from_name: 'Keywise',
            html: `<html><body style="font-family:Arial;padding:20px;background:#F0F4FF"><div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;padding:32px"><div style="color:#0F3460;font-weight:700;font-size:20px;margin-bottom:20px">Keywise</div><div style="background:#FFF0F0;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px"><div style="font-size:28px">&#9888;</div><div style="font-size:18px;font-weight:700;color:#CC0000">Auto-Pay Failed</div><div style="font-size:24px;font-weight:700;color:#0F3460">$${(payment.amount || 0).toLocaleString()}</div></div><p style="color:#4A5068">Your auto-pay for ${payment.property || ''} could not be processed. Please log in to pay manually.</p><a href="https://keywise.app" style="display:inline-block;background:#0F3460;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Pay Now</a></div></body></html>`,
          }),
        }).catch(() => {});
      }

      // Notify landlord
      if (landlordProfile?.email) {
        fetch(`${baseUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: landlordProfile.email,
            subject: `Auto-pay failed — ${payment.tenant_name}`,
            from_name: 'Keywise',
            html: `<html><body style="font-family:Arial;padding:20px"><p>Auto-pay of $${(payment.amount || 0).toLocaleString()} from ${payment.tenant_name} for ${payment.property || ''} failed. The tenant has been notified to pay manually.</p></body></html>`,
          }),
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ success: true, charged, failed, skipped, total: duePayments?.length || 0, date: today });
}
