import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { lease_id, user_id, tenant_email, tenant_name, document_type, message, landlord_name } = await req.json();

    if (!lease_id || !tenant_email || !document_type) {
      return NextResponse.json({ error: 'lease_id, tenant_email, and document_type are required' }, { status: 400 });
    }

    // Save request
    const { error: insertErr } = await supabase.from('document_requests').insert({
      lease_id, user_id, tenant_email, tenant_name, document_type, message, status: 'pending',
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Send email
    const typeLabel = document_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F0F4FF;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,52,96,0.12);">
  <div style="background:#0F3460;padding:24px 32px;"><div style="color:#00D4AA;font-size:20px;font-weight:700;">Keywise</div></div>
  <div style="padding:32px;">
    <div style="font-size:20px;font-weight:700;color:#0F3460;margin-bottom:8px;">Document Requested</div>
    <div style="font-size:14px;color:#8892A4;margin-bottom:24px;">Hi ${tenant_name || 'there'}, ${landlord_name || 'your landlord'} has requested the following document:</div>
    <div style="background:#F0F4FF;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:13px;color:#8892A4;margin-bottom:4px;">Requested Document</div>
      <div style="font-size:16px;font-weight:700;color:#0F3460;">📄 ${typeLabel}</div>
    </div>
    ${message ? `<div style="background:#FFF8E0;border-radius:10px;padding:14px 16px;margin-bottom:24px;"><div style="font-size:13px;color:#9A6500;">"${message}"</div></div>` : ''}
    <a href="https://keywise.app" style="display:block;background:#00D4AA;color:#0F3460;text-align:center;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Upload Document →</a>
  </div>
  <div style="background:#F0F4FF;padding:16px 32px;text-align:center;"><div style="font-size:12px;color:#8892A4;">Powered by Keywise · keywise.app</div></div>
</div>
</body></html>`;

    await resend.emails.send({
      from: 'Keywise <noreply@keywise.app>',
      to: tenant_email,
      subject: `Document requested: ${typeLabel}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[request-document] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
