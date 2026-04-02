import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import twilio from 'twilio';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('[invite-tenant] SUPABASE_SERVICE_ROLE_KEY is not set — admin methods will fail');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { lease_id, tenant_email, tenant_name } = await req.json();

    if (!lease_id || !tenant_email) {
      return NextResponse.json({ error: 'lease_id and tenant_email are required' }, { status: 400 });
    }

    // Fetch lease details (rent, property, user_id) and landlord profile in parallel
    const { data: lease } = await supabase
      .from('leases')
      .select('phone, rent, property, user_id')
      .eq('id', lease_id)
      .single();

    const landlordProfile = lease?.user_id
      ? await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', lease.user_id)
          .single()
          .then(r => r.data)
      : null;

    const landlordName = landlordProfile?.full_name || 'Your landlord';
    const propertyAddress = lease?.property || '';
    const monthlyRent = lease?.rent ? '$' + Number(lease.rent).toLocaleString() + '/mo' : '';

    console.log('[invite-tenant] Generating magic link for', tenant_email);

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: tenant_email,
      options: {
        redirectTo: 'https://keywise.app/?tenant=true',
      },
    });

    if (error) {
      console.error('[invite-tenant] generateLink error:', error.message, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const magicLink = data.properties?.action_link;
    console.log('[invite-tenant] Magic link generated for', tenant_email);

    // Send branded email via Resend
    let sentEmail = false;
    if (magicLink) {
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0f2942;padding:32px 40px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Keywise</div>
            <div style="font-size:12px;color:#5fb3b3;margin-top:4px;letter-spacing:0.5px;">PROPERTY MANAGEMENT, MADE INTELLIGENT</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:16px;color:#6b7280;">Hi${tenant_name ? ' ' + tenant_name : ''},</p>
            <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#0f2942;line-height:1.3;">
              ${landlordName} invited you to manage your lease online
            </h1>
            ${propertyAddress ? `<div style="background:#f4f6f9;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Property</div>
              <div style="font-size:15px;color:#0f2942;font-weight:600;">${propertyAddress}</div>
              ${monthlyRent ? `<div style="font-size:14px;color:#5fb3b3;margin-top:2px;">${monthlyRent}</div>` : ''}
            </div>` : ''}
            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.6;">
              With Keywise you can view your lease, pay rent online, submit maintenance requests, and message your landlord — all in one place.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td align="center">
                <a href="${magicLink}" style="display:inline-block;background:#5fb3b3;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:8px;letter-spacing:0.2px;">
                  Get Started →
                </a>
              </td></tr>
            </table>
            <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;">
              This link expires in 24 hours. If you didn't expect this email, you can safely ignore it.<br>
              Or copy this link: <a href="${magicLink}" style="color:#5fb3b3;word-break:break-all;">${magicLink}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Keywise · Property management, made intelligent<br>
              <a href="https://keywise.app" style="color:#5fb3b3;text-decoration:none;">keywise.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Keywise <noreply@keywise.app>',
          to: tenant_email,
          subject: `${landlordName} invited you to pay rent on Keywise`,
          html,
        });
        if (emailError) {
          console.error('[invite-tenant] Resend error:', emailError);
        } else {
          sentEmail = true;
          console.log('[invite-tenant] Email sent to', tenant_email);
        }
      } catch (emailErr: any) {
        console.error('[invite-tenant] Email send failed:', emailErr.message);
      }
    }

    // Send SMS via Twilio if phone exists
    let sentSms = false;
    let sentToPhone: string | null = null;

    if (lease?.phone && magicLink) {
      try {
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        const formatted = lease.phone.startsWith('+') ? lease.phone : '+1' + lease.phone.replace(/\D/g, '');
        await twilioClient.messages.create({
          body: `Hi ${tenant_name || 'there'}! ${landlordName} invited you to Keywise to manage your lease and pay rent online. Tap here to get started: ${magicLink}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formatted,
        });
        sentSms = true;
        sentToPhone = formatted;
        console.log('[invite-tenant] SMS sent to', formatted);
      } catch (smsErr: any) {
        console.error('[invite-tenant] SMS failed:', smsErr.message);
      }
    }

    // Mark the lease as invited
    const { error: updateError } = await supabase
      .from('leases')
      .update({
        invite_sent: true,
        invite_sent_at: new Date().toISOString(),
      })
      .eq('id', lease_id);

    if (updateError) {
      console.error('[invite-tenant] lease update error:', updateError.message);
    }

    return NextResponse.json({
      success: true,
      magic_link: magicLink,
      sent_email: sentEmail,
      sent_sms: sentSms,
      phone: sentToPhone,
    });
  } catch (err: any) {
    console.error('[invite-tenant] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate invite link.' }, { status: 500 });
  }
}
