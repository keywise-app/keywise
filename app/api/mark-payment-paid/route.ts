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

    if (payment_id) {
      // Mark specific payment
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', paid_date: today, method: 'Online (Stripe)' })
        .eq('id', payment_id)
        .eq('status', 'pending');
      return NextResponse.json({ success: !error, error: error?.message });
    }

    if (lease_id && due_date) {
      // Mark by lease + due date
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', paid_date: today, method: 'Online (Stripe)' })
        .eq('lease_id', lease_id)
        .eq('due_date', due_date)
        .eq('status', 'pending');
      return NextResponse.json({ success: !error, error: error?.message });
    }

    if (lease_id) {
      // Mark oldest pending payment for this lease
      const { data: pending } = await supabase
        .from('payments')
        .select('id')
        .eq('lease_id', lease_id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(1);

      if (pending && pending.length > 0) {
        const { error } = await supabase
          .from('payments')
          .update({ status: 'paid', paid_date: today, method: 'Online (Stripe)' })
          .eq('id', pending[0].id);
        return NextResponse.json({ success: !error, error: error?.message });
      }
      return NextResponse.json({ success: false, error: 'No pending payment found' });
    }

    return NextResponse.json({ error: 'lease_id or payment_id required' }, { status: 400 });
  } catch (err: any) {
    console.error('[mark-payment-paid] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
