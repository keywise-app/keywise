import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_founding_member', true)
      .eq('founding_member_continuous', true);

    return NextResponse.json({ claimed: count ?? 0, total: 100, remaining: 100 - (count ?? 0) });
  } catch {
    return NextResponse.json({ claimed: 0, total: 100, remaining: 100 });
  }
}
