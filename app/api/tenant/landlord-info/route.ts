import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leaseId = searchParams.get('lease_id');
  if (!leaseId) return NextResponse.json({ error: 'lease_id required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: lease } = await supabase.from('leases').select('user_id').eq('id', leaseId).single();
  if (!lease) return NextResponse.json({ landlord: null });

  const { data: landlord } = await supabase.from('profiles').select('full_name, email, phone, company, stripe_account_id').eq('id', lease.user_id).single();
  return NextResponse.json({ landlord });
}
