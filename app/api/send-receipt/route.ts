import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { payment_id, tenant_name, tenant_email, property, amount, paid_date, method, landlord_name, landlord_email } = await req.json();

    if (!tenant_email) {
      return NextResponse.json({ error: 'No tenant email provided' }, { status: 400 });
    }

    const propertyShort = (property || '').split(',')[0] || property || '';
    const amountFormatted = Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const receiptId = `KW-${(payment_id || '').toUpperCase().slice(0, 8)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt</title>
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,52,96,0.12);">

    <!-- Header -->
    <div style="background:#0F3460;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Keywise</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Property Management</div>
    </div>

    <!-- Success badge -->
    <div style="padding:32px 32px 0;text-align:center;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:#E8F8F0;margin-bottom:16px;">
        <span style="font-size:32px;line-height:1;">✓</span>
      </div>
      <div style="font-size:24px;font-weight:800;color:#0F3460;margin-bottom:4px;">Payment Received</div>
      <div style="font-size:14px;color:#8892A4;">Your payment has been confirmed and recorded.</div>
    </div>

    <!-- Amount -->
    <div style="margin:24px 32px;background:#F0F4FF;border-radius:12px;padding:20px;text-align:center;">
      <div style="font-size:42px;font-weight:800;color:#0F3460;letter-spacing:-2px;">$${amountFormatted}</div>
      <div style="font-size:13px;color:#8892A4;margin-top:4px;">${propertyShort}</div>
    </div>

    <!-- Receipt details -->
    <div style="margin:0 32px 24px;">
      <div style="font-size:11px;font-weight:700;color:#8892A4;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;">Receipt Details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${[
          ['Receipt ID', receiptId],
          ['Tenant', tenant_name || '—'],
          ['Property', propertyShort || '—'],
          ['Date Paid', paid_date || '—'],
          ['Payment Method', method || '—'],
          ['Received By', landlord_name || '—'],
        ].map(([label, value]) => `
        <tr>
          <td style="padding:10px 0;font-size:13px;color:#8892A4;border-bottom:1px solid #E0E6F0;width:45%;">${label}</td>
          <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1A1A2E;border-bottom:1px solid #E0E6F0;text-align:right;">${value}</td>
        </tr>`).join('')}
      </table>
    </div>

    <!-- Notice -->
    <div style="margin:0 32px 28px;background:#E0FAF5;border:1px solid #00D4AA44;border-radius:10px;padding:14px 16px;">
      <div style="font-size:13px;color:#00A886;font-weight:600;">Keep this email as your payment confirmation.</div>
      <div style="font-size:12px;color:#00A886;margin-top:4px;opacity:0.8;">This serves as your official receipt for the payment above.</div>
    </div>

    <!-- Questions -->
    ${landlord_email ? `<div style="margin:0 32px 28px;font-size:13px;color:#8892A4;text-align:center;">Questions? Contact your landlord at <a href="mailto:${landlord_email}" style="color:#0F3460;font-weight:600;">${landlord_email}</a></div>` : ''}

    <!-- Footer -->
    <div style="background:#F0F4FF;padding:20px 32px;text-align:center;border-top:1px solid #E0E6F0;">
      <div style="font-size:12px;color:#8892A4;">Powered by <strong style="color:#0F3460;">Keywise</strong> · keywise.app</div>
      <div style="font-size:11px;color:#8892A4;margin-top:4px;">Property management, made intelligent.</div>
    </div>
  </div>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: 'Keywise <noreply@keywise.app>',
      to: tenant_email,
      subject: `Payment Receipt — $${amountFormatted} — ${propertyShort}`,
      html,
    });

    if (error) {
      console.error('[send-receipt] Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[send-receipt] Sent receipt to:', tenant_email, '| id:', data?.id);
    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error('[send-receipt] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send receipt.' }, { status: 500 });
  }
}
