import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { document_id, lease_id, tenant_email, tenant_name, document_name, landlord_name, landlord_email } = await req.json();

    if (!document_id || !tenant_email) {
      return NextResponse.json({ error: 'Missing document_id or tenant_email' }, { status: 400 });
    }

    // Generate a unique token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

    // Store in signing_tokens (expires in 7 days)
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: tokenError } = await supabase.from('signing_tokens').insert({
      token,
      document_id,
      lease_id: lease_id || null,
      tenant_email,
      tenant_name: tenant_name || '',
      expires_at,
    });

    if (tokenError) {
      console.error('[signing-link] Token insert error:', tokenError);
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    // Mark document as requires_signature
    await supabase.from('documents').update({ requires_signature: true }).eq('id', document_id);

    const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://keywise.app'}/sign/${token}`;
    const docName = document_name || 'Document';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Document Ready for Signature</title></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,52,96,0.12);">
    <div style="background:#0F3460;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Keywise</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Property Management</div>
    </div>
    <div style="padding:32px;">
      <div style="font-size:22px;font-weight:800;color:#0F3460;margin-bottom:8px;">Document ready to sign</div>
      <div style="font-size:14px;color:#8892A4;margin-bottom:24px;">Hi ${tenant_name || 'there'}, ${landlord_name || 'Your landlord'} has sent you a document that requires your signature.</div>
      <div style="background:#F0F4FF;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:13px;color:#8892A4;margin-bottom:4px;">Document</div>
        <div style="font-size:16px;font-weight:700;color:#0F3460;">📄 ${docName}</div>
      </div>
      <a href="${signingUrl}" style="display:block;background:#00D4AA;color:#0F3460;text-align:center;padding:16px 28px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:20px;">Review &amp; Sign Document →</a>
      <div style="font-size:12px;color:#8892A4;text-align:center;">This link expires in 7 days. If you did not expect this, contact ${landlord_email || 'your landlord'}.</div>
    </div>
    <div style="background:#F0F4FF;padding:20px 32px;text-align:center;border-top:1px solid #E0E6F0;">
      <div style="font-size:12px;color:#8892A4;">Powered by <strong style="color:#0F3460;">Keywise</strong> · keywise.app</div>
    </div>
  </div>
</body>
</html>`;

    const { error: emailError } = await resend.emails.send({
      from: 'Keywise <noreply@keywise.app>',
      to: tenant_email,
      subject: `Please sign: ${docName}`,
      html,
    });

    if (emailError) {
      console.error('[signing-link] Email error:', emailError);
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    console.log('[signing-link] Sent signing link to:', tenant_email);
    return NextResponse.json({ success: true, token });
  } catch (err: any) {
    console.error('[signing-link] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send signing link.' }, { status: 500 });
  }
}
