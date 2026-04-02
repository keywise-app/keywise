import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const PLATFORM_FEE_CENTS = parseInt(process.env.KEYWISE_PLATFORM_FEE || '200', 10);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function paymentEmailHtml({
  tenant_name, property, amount, due_date, description, payment_type, payment_link, landlord_name,
}: {
  tenant_name: string; property: string; amount: number; due_date: string;
  description: string; payment_type: string; payment_link: string; landlord_name: string;
}) {
  const propertyShort = property?.split(',')[0] || property;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FF;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#0F3460;border-radius:12px 12px 0 0;padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#00D4AA;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Keywise</td>
              <td align="right" style="color:rgba(255,255,255,0.5);font-size:12px;">Property Management</td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;">
          <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0F3460;">Payment Request</p>
          <p style="margin:0 0 24px;font-size:14px;color:#8892A4;">Hi ${tenant_name},</p>

          <!-- Details card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FF;border-radius:10px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${description ? `<tr>
                  <td style="padding:6px 0;font-size:12px;color:#8892A4;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;width:120px;">Description</td>
                  <td style="padding:6px 0;font-size:13px;color:#1A1A2E;font-weight:600;">${description}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#8892A4;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Type</td>
                  <td style="padding:6px 0;font-size:13px;color:#1A1A2E;">${payment_type}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#8892A4;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Property</td>
                  <td style="padding:6px 0;font-size:13px;color:#1A1A2E;">${propertyShort}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#8892A4;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Due Date</td>
                  <td style="padding:6px 0;font-size:13px;color:#1A1A2E;">${due_date}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0 6px;font-size:12px;color:#8892A4;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Amount Due</td>
                  <td style="padding:10px 0 6px;font-size:26px;font-weight:700;color:#0F3460;">$${Number(amount).toLocaleString()}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${payment_link}" style="display:inline-block;background:#00D4AA;color:#0F3460;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:10px;letter-spacing:-0.2px;">
                Pay Now →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:12px;color:#8892A4;text-align:center;">
            You can also copy and paste this link into your browser:<br>
            <a href="${payment_link}" style="color:#00A886;font-size:11px;word-break:break-all;">${payment_link}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F0F4FF;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#8892A4;">
            Sent by ${landlord_name} via <strong style="color:#0F3460;">Keywise</strong> · <a href="https://keywise.app" style="color:#00A886;text-decoration:none;">keywise.app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      lease_id, type, amount, description, due_date, recurring,
      tenant_email, tenant_phone, tenant_name, property,
      notify_email, notify_sms,
    } = await req.json();

    if (!lease_id || !amount || !due_date) {
      return NextResponse.json({ error: 'lease_id, amount, and due_date are required' }, { status: 400 });
    }

    // Fetch the lease to get the landlord's user_id and profile
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('user_id, tenant_name, property, rent, start_date, end_date, payment_day')
      .eq('id', lease_id)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }

    const resolvedTenantName = tenant_name || lease.tenant_name;
    const resolvedProperty = property || lease.property;

    // Fetch landlord profile for Stripe account and display name
    const { data: landlordProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id, full_name, company')
      .eq('id', lease.user_id)
      .single();

    if (!landlordProfile?.stripe_account_id) {
      return NextResponse.json({ error: 'Landlord has not connected a Stripe account. Go to Settings → Payments.' }, { status: 400 });
    }

    const landlordName = landlordProfile.full_name || landlordProfile.company || 'Your landlord';
    const amountNum = Number(amount);
    const amountCents = Math.round(amountNum * 100);

    // Build payment dates — for recurring, generate all monthly dates through lease end
    const dates: string[] = [];
    if (recurring && type === 'Monthly Rent' && lease.start_date && lease.end_date) {
      const payDay = lease.payment_day || 1;
      const start = new Date(lease.start_date);
      const end = new Date(lease.end_date);
      let current = new Date(start.getFullYear(), start.getMonth(), payDay);
      if (current < start) current = new Date(start.getFullYear(), start.getMonth() + 1, payDay);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current = new Date(current.getFullYear(), current.getMonth() + 1, payDay);
      }
    } else {
      dates.push(due_date);
    }

    // Create Stripe payment link for the first (or only) payment
    const productName = `${type} — ${resolvedTenantName}${resolvedProperty ? ', ' + resolvedProperty.split(',')[0] : ''}${due_date ? ' (due ' + due_date + ')' : ''}`;

    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: amountCents,
      product_data: {
        name: productName,
        metadata: { lease_id, tenant_name: resolvedTenantName, property: resolvedProperty, due_date, description: description || '' },
      },
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      application_fee_amount: PLATFORM_FEE_CENTS,
      transfer_data: { destination: landlordProfile.stripe_account_id },
      metadata: { lease_id, tenant_name: resolvedTenantName, due_date, landlord_user_id: lease.user_id },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: `Thank you! Your payment of $${amountNum.toLocaleString()} has been received.`,
        },
      },
    });

    const today = new Date().toISOString().split('T')[0];

    // Insert all payment records
    const insertRows = dates.map((d) => ({
      user_id: lease.user_id,
      lease_id,
      tenant_name: resolvedTenantName,
      property: resolvedProperty,
      amount: amountNum,
      due_date: d,
      status: d < today ? 'overdue' : 'pending',
      description: description || null,
      payment_link_url: paymentLink.url,
    }));

    const { data: insertedPayments, error: insertError } = await supabase
      .from('payments')
      .insert(insertRows)
      .select('id');

    if (insertError) {
      console.error('[payment-request] insert error:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const firstPaymentId = insertedPayments?.[0]?.id;

    // Send email notification
    console.log('[payment-request] notify_email:', notify_email, '| tenant_email:', tenant_email);
    if (notify_email && tenant_email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://keywise.app';
        const emailUrl = `${baseUrl}/api/send-email`;
        console.log('[payment-request] Calling send-email at:', emailUrl);
        const emailRes = await fetch(emailUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: tenant_email,
            subject: `Payment Request: $${amountNum.toLocaleString()} due ${due_date}`,
            from_name: landlordName,
            html: paymentEmailHtml({
              tenant_name: resolvedTenantName,
              property: resolvedProperty,
              amount: amountNum,
              due_date,
              description: description || '',
              payment_type: type,
              payment_link: paymentLink.url,
              landlord_name: landlordName,
            }),
          }),
        });
        const emailData = await emailRes.json();
        console.log('[payment-request] send-email response status:', emailRes.status, '| body:', JSON.stringify(emailData));
      } catch (emailErr: any) {
        console.error('[payment-request] email send failed:', emailErr.message);
      }
    } else {
      console.log('[payment-request] Skipping email — notify_email:', notify_email, 'tenant_email:', tenant_email);
    }

    // Send SMS notification
    if (notify_sms && tenant_phone) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://keywise.app';
        await fetch(`${baseUrl}/api/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: tenant_phone,
            message: `Hi ${resolvedTenantName.split(' ')[0]}! A payment of $${amountNum.toLocaleString()} is due ${due_date}${description ? ' for ' + description : ''}. Pay here: ${paymentLink.url}`,
          }),
        });
      } catch (smsErr: any) {
        console.error('[payment-request] sms send failed:', smsErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      payment_id: firstPaymentId,
      payment_link: paymentLink.url,
      payments_created: insertRows.length,
    });
  } catch (err: any) {
    console.error('[payment-request] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create payment request.' }, { status: 500 });
  }
}
