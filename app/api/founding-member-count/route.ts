import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  if (!process.env.STRIPE_PRO_FOUNDING_PRICE_ID) {
    return NextResponse.json({ error: 'Founding offer is not available.' }, { status: 503 });
  }
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_founding_member', true);

    if (error || count === null) throw new Error('Founding offer count unavailable');
    return NextResponse.json({ claimed: count, total: 100, remaining: Math.max(0, 100 - count) });
  } catch {
    return NextResponse.json({ error: 'Founding offer availability is temporarily unavailable.' }, { status: 503 });
  }
}
