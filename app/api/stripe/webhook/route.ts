import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

// Webhook handler must use service-role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function updateProfileByCustomer(
  stripeCustomerId: string,
  patch: Record<string, any>
) {
  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('stripe_customer_id', stripeCustomerId);
  if (error) console.error('[webhook] profile update error:', error.message);
}

async function getProfileByCustomer(stripeCustomerId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
  return data;
}

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

  try {
    // ── Rent payment succeeded ──────────────────────────────────────────────
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const { lease_id, tenant_name, due_date } = intent.metadata || {};
      const today = new Date().toISOString().split('T')[0];

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
          return NextResponse.json({ received: true });
        }
      }

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
        }
      }
    }

    // ── Checkout session completed (Payment Links + Subscriptions) ──────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle subscription checkout
      if (session.mode === 'subscription') {
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        if (userId) {
          const patch: Record<string, any> = {
            subscription_status: 'active',
            stripe_customer_id: session.customer as string,
          };

          if (plan === 'founding') {
            // Claim next founding member number
            const { count } = await supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('is_founding_member', true)
              .eq('founding_member_continuous', true);
            const nextNumber = (count ?? 0) + 1;
            if (nextNumber <= 100) {
              patch.is_founding_member = true;
              patch.founding_member_number = nextNumber;
              patch.founding_member_locked_at = new Date().toISOString();
              patch.founding_member_continuous = true;
              patch.price_tier = 'founding_29';
            } else {
              patch.price_tier = 'standard_49';
            }
          } else if (plan === 'annual') {
            patch.price_tier = 'annual_390';
          } else {
            patch.price_tier = 'standard_49';
          }

          await supabase.from('profiles').update(patch).eq('id', userId);

          // Send founding member welcome email
          if (plan === 'founding' && patch.founding_member_number) {
            const profile = await getProfileByCustomer(session.customer as string);
            if (profile?.email) {
              await resend.emails.send({
                from: 'Keywise <noreply@keywise.app>',
                to: profile.email,
                subject: `Welcome, Founding Member #${patch.founding_member_number}!`,
                html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="font-size:22px;font-weight:700;color:#0F3460;margin-bottom:24px;">Keywise</div>
  <h2 style="font-size:22px;font-weight:700;color:#0F3460;margin:0 0 16px;">Welcome, Founding Member #${patch.founding_member_number}!</h2>
  <p style="font-size:15px;color:#4A5068;line-height:1.7;margin:0 0 16px;">
    Hi${profile.full_name ? ' ' + profile.full_name : ''},<br><br>
    You're one of the first 100 California landlords building Keywise with us. Your founding member rate of <strong>$29/month</strong> is locked in for life — as long as you maintain a continuous subscription.
  </p>
  <div style="background:#F0F4FF;border:1px solid #E0E6F0;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
    <div style="font-size:13px;font-weight:700;color:#0F3460;margin-bottom:8px;">Your founding member terms:</div>
    <ul style="font-size:13px;color:#4A5068;line-height:1.7;padding-left:18px;margin:0;">
      <li>$29/mo for life with continuous subscription</li>
      <li>All Pro features — unlimited units, compliance tools, AI extraction</li>
      <li>If you cancel, you'll resubscribe at the current standard price ($49/mo)</li>
    </ul>
  </div>
  <a href="https://keywise.app/?page=dashboard" style="display:inline-block;background:#00D4AA;color:#0F3460;text-decoration:none;font-size:15px;font-weight:700;padding:13px 32px;border-radius:8px;">
    Go to Dashboard →
  </a>
  <p style="margin:32px 0 0;font-size:12px;color:#8892A4;">
    Questions? Reply to this email or contact us at <a href="mailto:hello@keywise.app" style="color:#00A886;">hello@keywise.app</a>
  </p>
</div>`,
              });
            }
          }
        }
      }

      const { lease_id, tenant_name, due_date } = session.metadata || {};
      const today = new Date().toISOString().split('T')[0];

      // Try to match by metadata first (lease_id + due_date)
      if (lease_id && due_date) {
        const { error } = await supabase
          .from('payments')
          .update({ status: 'paid', paid_date: today, method: 'Online (Stripe)' })
          .eq('lease_id', lease_id)
          .eq('due_date', due_date)
          .neq('status', 'paid');
        if (error) console.error('[webhook] checkout update error (lease_id):', error);
      }
      // Fallback: match by tenant_name + due_date
      else if (tenant_name && due_date) {
        const { error } = await supabase
          .from('payments')
          .update({ status: 'paid', paid_date: today, method: 'Online (Stripe)' })
          .eq('tenant_name', tenant_name)
          .eq('due_date', due_date)
          .neq('status', 'paid');
        if (error) console.error('[webhook] checkout update error (tenant):', error);
      }
      // Last resort: match by payment_link URL
      else if (session.payment_link) {
        const linkId = typeof session.payment_link === 'string' ? session.payment_link : session.payment_link;
        // Fetch the payment link to get its URL
        try {
          const link = await stripe.paymentLinks.retrieve(linkId as string);
          if (link.url) {
            const { error } = await supabase
              .from('payments')
              .update({ status: 'paid', paid_date: today, method: 'Online (Stripe)' })
              .eq('payment_link_url', link.url)
              .neq('status', 'paid');
            if (error) console.error('[webhook] checkout update error (link url):', error);
          }
        } catch (e: any) {
          console.error('[webhook] Could not retrieve payment link:', e.message);
        }
      }
    }

    // ── Subscription created ────────────────────────────────────────────────
    if (event.type === 'customer.subscription.created') {
      const sub = event.data.object as Stripe.Subscription;
      const trialEnd = sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null;
      await updateProfileByCustomer(sub.customer as string, {
        subscription_status: sub.status,
        trial_ends_at: trialEnd,
      });
    }

    // ── Subscription updated ────────────────────────────────────────────────
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const trialEnd = sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null;
      await updateProfileByCustomer(sub.customer as string, {
        subscription_status: sub.status,
        trial_ends_at: trialEnd,
      });
    }

    // ── Subscription deleted/cancelled ─────────────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      // Check if this was a founding member — release their spot
      const { data: cancelProfile } = await supabase
        .from('profiles')
        .select('is_founding_member, founding_member_number, email, full_name')
        .eq('stripe_customer_id', customerId)
        .single();

      const patch: Record<string, any> = { subscription_status: 'cancelled' };
      if (cancelProfile?.is_founding_member) {
        patch.founding_member_continuous = false;
        patch.founding_member_number = null;

        // Notify them they lost their founding rate
        if (cancelProfile.email) {
          await resend.emails.send({
            from: 'Keywise <noreply@keywise.app>',
            to: cancelProfile.email,
            subject: "You've lost your founding member rate",
            html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="font-size:22px;font-weight:700;color:#0F3460;margin-bottom:24px;">Keywise</div>
  <h2 style="font-size:20px;font-weight:700;color:#0F3460;margin:0 0 16px;">Your founding member rate has ended</h2>
  <p style="font-size:15px;color:#4A5068;line-height:1.7;margin:0 0 24px;">
    Hi${cancelProfile.full_name ? ' ' + cancelProfile.full_name : ''},<br><br>
    Your Keywise subscription has been cancelled and your founding member rate of $29/month is no longer active.
    If you resubscribe in the future, you'll pay the current standard price.
  </p>
  <a href="https://keywise.app/?page=settings" style="display:inline-block;background:#0F3460;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 32px;border-radius:8px;">
    Resubscribe →
  </a>
  <p style="margin:32px 0 0;font-size:12px;color:#8892A4;">
    Questions? Contact us at <a href="mailto:hello@keywise.app" style="color:#00A886;">hello@keywise.app</a>
  </p>
</div>`,
          });
        }
      }

      await updateProfileByCustomer(customerId, patch);
    }

    // ── Trial ending soon (3 days warning from Stripe) ─────────────────────
    if (event.type === 'customer.subscription.trial_will_end') {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const trialEnd = sub.trial_end
        ? new Date(sub.trial_end * 1000)
        : new Date(Date.now() + 3 * 86400000);
      const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / 86400000);
      const profile = await getProfileByCustomer(customerId);

      if (profile?.email) {
        await resend.emails.send({
          from: 'Keywise <noreply@keywise.app>',
          to: profile.email,
          subject: `Your Keywise trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="font-size:22px;font-weight:700;color:#0F3460;margin-bottom:24px;">Keywise</div>
  <h2 style="font-size:22px;font-weight:700;color:#0F3460;margin:0 0 16px;">Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</h2>
  <p style="font-size:15px;color:#4A5068;line-height:1.7;margin:0 0 24px;">
    Hi${profile.full_name ? ' ' + profile.full_name : ''},<br><br>
    Your Keywise Pro trial ends on <strong>${trialEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
    Add a payment method to keep access to all Pro features — unlimited units, online rent collection, and more.
  </p>
  <a href="https://keywise.app/?page=settings" style="display:inline-block;background:#00D4AA;color:#0F3460;text-decoration:none;font-size:15px;font-weight:700;padding:13px 32px;border-radius:8px;">
    Add Payment Method →
  </a>
  <p style="margin:32px 0 0;font-size:12px;color:#8892A4;">
    Questions? Reply to this email or contact us at <a href="mailto:hello@keywise.app" style="color:#00A886;">hello@keywise.app</a>
  </p>
</div>`,
        });
      }
    }

    // ── Invoice payment succeeded ───────────────────────────────────────────
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        await updateProfileByCustomer(invoice.customer as string, {
          subscription_status: 'active',
        });
      }
    }

    // ── Invoice payment failed ──────────────────────────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      if (customerId) {
        await updateProfileByCustomer(customerId, {
          subscription_status: 'past_due',
        });

        const profile = await getProfileByCustomer(customerId);
        if (profile?.email) {
          await resend.emails.send({
            from: 'Keywise <noreply@keywise.app>',
            to: profile.email,
            subject: 'Action required: Your Keywise payment failed',
            html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="font-size:22px;font-weight:700;color:#0F3460;margin-bottom:24px;">Keywise</div>
  <div style="background:#FFF4EE;border:1px solid #FED7AA;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
    <div style="font-size:14px;font-weight:700;color:#C2410C;">⚠ Payment failed</div>
  </div>
  <h2 style="font-size:20px;font-weight:700;color:#0F3460;margin:0 0 16px;">We couldn't process your payment</h2>
  <p style="font-size:15px;color:#4A5068;line-height:1.7;margin:0 0 24px;">
    Hi${profile.full_name ? ' ' + profile.full_name : ''},<br><br>
    We were unable to charge your payment method for your Keywise Pro subscription.
    Please update your payment method to avoid losing access to Pro features.
  </p>
  <a href="https://keywise.app/?page=settings" style="display:inline-block;background:#0F3460;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 32px;border-radius:8px;">
    Update Payment Method →
  </a>
  <p style="margin:32px 0 0;font-size:12px;color:#8892A4;">
    Need help? Contact us at <a href="mailto:hello@keywise.app" style="color:#00A886;">hello@keywise.app</a>
  </p>
</div>`,
          });
        }
      }
    }
  } catch (err: any) {
    console.error('[webhook] Handler error:', err.message);
    // Don't return 500 — Stripe retries on non-2xx, we don't want retry loops
  }

  return NextResponse.json({ received: true });
}
