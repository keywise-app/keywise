import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { lease_id, payment_id, due_date } = await req.json();
    const today = new Date().toISOString().split('T')[0];
    const updateData = { status: 'paid', paid_date: today, method: 'Online (Stripe)' };

    let updatedId: string | null = null;

    if (payment_id) {
      const { error } = await supabase.from('payments').update(updateData)
        .eq('id', payment_id).neq('status', 'paid');
      if (!error) updatedId = payment_id;
      else console.error('[mark-payment-paid] by id error:', error.message);
    } else if (lease_id && due_date) {
      // Find payment by lease + due date
      const { data } = await supabase.from('payments').select('id')
        .eq('lease_id', lease_id).eq('due_date', due_date).neq('status', 'paid').limit(1);
      if (data?.[0]) {
        await supabase.from('payments').update(updateData).eq('id', data[0].id);
        updatedId = data[0].id;
      }
    } else if (lease_id) {
      // Oldest unpaid payment
      const { data } = await supabase.from('payments').select('id')
        .eq('lease_id', lease_id).neq('status', 'paid')
        .order('due_date', { ascending: true }).limit(1);
      if (data?.[0]) {
        await supabase.from('payments').update(updateData).eq('id', data[0].id);
        updatedId = data[0].id;
      }
    } else {
      return NextResponse.json({ error: 'lease_id or payment_id required' }, { status: 400 });
    }

    if (!updatedId) {
      return NextResponse.json({ success: false, error: 'No unpaid payment found' });
    }

    // Send notification emails
    try {
      const { data: payment } = await supabase.from('payments').select('*').eq('id', updatedId).single();
      if (payment) {
        const { data: landlord } = await supabase.from('profiles').select('email, full_name, notify_payment').eq('id', payment.user_id).single();
        const { data: lease } = await supabase.from('leases').select('email').eq('id', payment.lease_id).single();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://keywise.app';
        const amt = (payment.amount || 0).toLocaleString();

        if (landlord?.email && landlord.notify_payment !== false) {
          fetch(`${baseUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: landlord.email,
              subject: `Payment received — ${payment.tenant_name}`,
              from_name: 'Keywise',
              html: `<html><body style="font-family:Arial;padding:20px;background:#F0F4FF"><div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;padding:32px"><div style="color:#0F3460;font-weight:700;font-size:20px;margin-bottom:20px">Keywise</div><div style="background:#E8F8F0;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px"><div style="font-size:28px">&#10003;</div><div style="font-size:20px;font-weight:700;color:#0F7040">Payment Received</div><div style="font-size:26px;font-weight:700;color:#0F3460">$${amt}</div></div><p style="color:#4A5068">From: ${payment.tenant_name}<br/>Property: ${payment.property}<br/>Date: ${today}</p><a href="${baseUrl}" style="display:inline-block;background:#0F3460;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View Dashboard</a></div></body></html>`,
            }),
          }).catch(() => {});
        }

        if (lease?.email) {
          fetch(`${baseUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: lease.email,
              subject: `Payment Receipt — $${amt}`,
              from_name: 'Keywise',
              html: `<html><body style="font-family:Arial;padding:20px;background:#F0F4FF"><div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;padding:32px"><div style="color:#0F3460;font-weight:700;font-size:20px;margin-bottom:20px">Keywise</div><div style="background:#E8F8F0;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px"><div style="font-size:28px">&#10003;</div><div style="font-size:20px;font-weight:700;color:#0F7040">Payment Confirmed</div><div style="font-size:26px;font-weight:700;color:#0F3460">$${amt}</div></div><p style="color:#4A5068">Property: ${payment.property}<br/>Date: ${today}<br/>Method: Online (Stripe)</p><p style="color:#8892A4;font-size:12px">Keep this as your payment confirmation.</p></div></body></html>`,
            }),
          }).catch(() => {});
        }
      }
    } catch { /* notifications are best-effort */ }

    return NextResponse.json({ success: true, payment_id: updatedId });
  } catch (err: any) {
    console.error('[mark-payment-paid] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
