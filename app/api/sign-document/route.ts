import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { token, signature_data, signature_type, signer_name } = await req.json();

    if (!token || !signature_data) {
      return NextResponse.json({ error: 'Missing token or signature_data' }, { status: 400 });
    }

    // Look up token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('signing_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenErr || !tokenRow) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    if (tokenRow.used_at) {
      return NextResponse.json({ error: 'This document has already been signed' }, { status: 400 });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Signing link has expired' }, { status: 400 });
    }

    const signed_at = new Date().toISOString();
    const finalSignerName = signer_name || tokenRow.tenant_name || '';

    // Update document with signature
    const { error: docErr } = await supabase.from('documents').update({
      signed_at,
      signer_name: finalSignerName,
      signature_data,
      signature_type: signature_type || 'draw',
      requires_signature: false,
    }).eq('id', tokenRow.document_id);

    if (docErr) {
      console.error('[sign-document] Doc update error:', docErr);
      return NextResponse.json({ error: docErr.message }, { status: 500 });
    }

    // Mark token as used
    await supabase.from('signing_tokens').update({ used_at: signed_at }).eq('token', token);

    // If this is an inspection signing, update the inspection record
    if (tokenRow.inspection_id) {
      const { error: inspErr } = await supabase.from('inspections').update({
        tenant_signature: signature_data,
        tenant_signed_at: signed_at,
        status: 'fully_signed',
      }).eq('id', tokenRow.inspection_id);
      if (inspErr) console.error('[sign-document] Inspection update error:', inspErr);
    }

    // Fetch document name
    const { data: docRow } = await supabase.from('documents').select('name').eq('id', tokenRow.document_id).single();
    const docName = docRow?.name || 'Document';

    // Confirmation emails
    const confirmHtml = (recipientName: string, role: 'tenant' | 'landlord') => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Document Signed</title></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,52,96,0.12);">
    <div style="background:#0F3460;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;">Keywise</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Property Management</div>
    </div>
    <div style="padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;background:#E8F8F0;margin-bottom:12px;">
          <span style="font-size:28px;">✓</span>
        </div>
        <div style="font-size:22px;font-weight:800;color:#0F3460;">Document Signed</div>
      </div>
      <div style="background:#F0F4FF;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;font-size:13px;color:#8892A4;border-bottom:1px solid #E0E6F0;">Document</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#1A1A2E;text-align:right;border-bottom:1px solid #E0E6F0;">${docName}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;color:#8892A4;border-bottom:1px solid #E0E6F0;">Signed by</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#1A1A2E;text-align:right;border-bottom:1px solid #E0E6F0;">${finalSignerName}</td></tr>
          <tr><td style="padding:8px 0;font-size:13px;color:#8892A4;">Signed on</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#1A1A2E;text-align:right;">${signed_at.slice(0, 10)}</td></tr>
        </table>
      </div>
      <div style="background:#E0FAF5;border:1px solid #00D4AA44;border-radius:10px;padding:14px 16px;">
        <div style="font-size:13px;color:#00A886;font-weight:600;">${role === 'tenant' ? 'Keep this email as your confirmation.' : 'The document has been signed and recorded.'}</div>
      </div>
    </div>
    <div style="background:#F0F4FF;padding:20px 32px;text-align:center;border-top:1px solid #E0E6F0;">
      <div style="font-size:12px;color:#8892A4;">Powered by <strong style="color:#0F3460;">Keywise</strong> · keywise.app</div>
    </div>
  </div>
</body></html>`;

    const emailPromises = [];

    if (tokenRow.tenant_email) {
      emailPromises.push(resend.emails.send({
        from: 'Keywise <noreply@keywise.app>',
        to: tokenRow.tenant_email,
        subject: `You signed: ${docName}`,
        html: confirmHtml(finalSignerName, 'tenant'),
      }));
    }

    // Also notify landlord — get from document's user_id
    const { data: docWithUser } = await supabase.from('documents').select('user_id').eq('id', tokenRow.document_id).single();
    if (docWithUser?.user_id) {
      const { data: landlordProfile } = await supabase.from('profiles').select('email, full_name').eq('id', docWithUser.user_id).single();
      if (landlordProfile?.email) {
        emailPromises.push(resend.emails.send({
          from: 'Keywise <noreply@keywise.app>',
          to: landlordProfile.email,
          subject: `Signed: ${docName} — ${finalSignerName}`,
          html: confirmHtml(landlordProfile.full_name || 'Landlord', 'landlord'),
        }));
      }
    }

    await Promise.allSettled(emailPromises);

    return NextResponse.json({ success: true, signed_at });
  } catch (err: any) {
    console.error('[sign-document] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to record signature.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const { data: tokenRow, error } = await supabase
    .from('signing_tokens')
    .select('*, documents(name, file_path, type)')
    .eq('token', token)
    .single();

  if (error || !tokenRow) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (tokenRow.used_at) return NextResponse.json({ error: 'Already signed', signed_at: tokenRow.used_at }, { status: 409 });
  if (new Date(tokenRow.expires_at) < new Date()) return NextResponse.json({ error: 'Token expired' }, { status: 410 });

  // Generate signed URL for the document if it has a file
  let file_url = '';
  if (tokenRow.documents?.file_path) {
    const { data: urlData } = await supabase.storage.from('documents').createSignedUrl(tokenRow.documents.file_path, 3600);
    file_url = urlData?.signedUrl || '';
  }

  // If inspection signing, include inspection data
  let inspection = null;
  if (tokenRow.inspection_id) {
    const { data: inspData } = await supabase.from('inspections').select('*').eq('id', tokenRow.inspection_id).single();
    inspection = inspData;
  }

  return NextResponse.json({
    tenant_name: tokenRow.tenant_name,
    tenant_email: tokenRow.tenant_email,
    document_name: tokenRow.documents?.name || 'Document',
    document_type: tokenRow.documents?.type || '',
    file_url,
    inspection,
  });
}
