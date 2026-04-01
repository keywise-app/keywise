import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMonthlySnapshot } from '../cron/monthly-snapshot/route';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: landlord, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (error || !landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    if (!landlord.email) {
      return NextResponse.json({ error: 'Landlord has no email address' }, { status: 400 });
    }

    await sendMonthlySnapshot(landlord, supabase);

    return NextResponse.json({ success: true, sent_to: landlord.email });
  } catch (err: any) {
    console.error('[send-snapshot] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to send snapshot.' }, { status: 500 });
  }
}
