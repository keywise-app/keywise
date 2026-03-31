import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { error } = await supabase.from('waitlist').insert({ email });

    if (error) {
      // 23505 = unique_violation — email already on list, treat as success
      if (error.code === '23505') {
        return NextResponse.json({ success: true });
      }
      console.error('[waitlist] insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[waitlist] Added:', email);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[waitlist] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Failed to join waitlist.' }, { status: 500 });
  }
}
