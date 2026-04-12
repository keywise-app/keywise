import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { page, referrer, user_agent } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.from('page_views').insert({
      page: page || '/',
      referrer: referrer || 'direct',
      user_agent: (user_agent || '').slice(0, 200),
      visited_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
