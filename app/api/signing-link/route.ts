import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { document_id, inspection_id, lease_id, tenant_email, tenant_name, document_name, landlord_name, landlord_email } = await req.json();

    if (!tenant_email) {
      return NextResponse.json({ error: 'Missing tenant_email' }, { status: 400 });
    }

    let finalDocId = document_id;

    // If this is an inspection signing, create a document record first
    if (inspection_id && !document_id) {
      const { data: inspection } = await supabase.from('inspections').select('*').eq('id', inspection_id).single();
      if (!inspection) {
        return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
      }
      const { data: doc, error: docErr } = await supabase.from('documents').insert({
        user_id: inspection.user_id,
        name: document_name || `${inspection.type === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection Report — ${inspection.tenant_name}`,
        type: inspection.type === 'move_in' ? 'move_in' : 'move_out',
        ownership_level: 'tenant',
        property: inspection.property || '',
        tenant_name: inspection.tenant_name || '',
        lease_id: inspection.lease_id || null,
        summary: (inspection.report_text || '').slice(0, 200),
        requires_signature: true,
        file_url: '', file_path: '', size: '',
      }).select('id').single();
      if (docErr || !doc) {
        console.error('[signing-link] Doc create error:', docErr);
        return NextResponse.json({ error: 'Failed to create document for inspection' }, { status: 500 });
      }
      finalDocId = doc.id;
    }

    if (!finalDocId) {
      return NextResponse.json({ error: 'Missing document_id' }, { status: 400 });
    }

    // Generate a unique token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

    // Store in signing_tokens (expires in 7 days)
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const tokenPayload: any = {
      token,
      document_id: finalDocId,
      lease_id: lease_id || null,
      tenant_email,
      tenant_name: tenant_name || '',
      expires_at,
    };
    if (inspection_id) tokenPayload.inspection_id = inspection_id;

    const { error: tokenError } = await supabase.from('signing_tokens').insert(tokenPayload);

    if (tokenError) {
      console.error('[signing-link] Token insert error:', tokenError);
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }

    // Mark document as requires_signature
    await supabase.from('documents').update({ requires_signature: true }).eq('id', finalDocId);

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

    return NextResponse.json({ success: true, token });
  } catch (err: any) {
    console.error('[signing-link] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send signing link.' }, { status: 500 });
  }
}
