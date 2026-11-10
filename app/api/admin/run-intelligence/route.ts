import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { password, reportDay } = await req.json();
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Import and run intelligence
    const { runIntelligence } = await import('@/lib/intelligence/daily');
    const result = await runIntelligence(supabase, 'admin-post', reportDay);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[run-intelligence] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
