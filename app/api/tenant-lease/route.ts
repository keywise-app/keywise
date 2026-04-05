import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const userId = searchParams.get('user_id');

  if (!email && !userId) return NextResponse.json({ error: 'email or user_id required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let lease = null;

  // Try by tenant_user_id first
  if (userId) {
    const { data } = await supabase.from('leases').select('*').eq('tenant_user_id', userId);
    if (data && data.length > 0) lease = data[0];
  }

  // Fallback: try by email (exact)
  if (!lease && email) {
    const { data } = await supabase.from('leases').select('*').eq('email', email);
    if (data && data.length > 0) {
      lease = data[0];
      // Auto-link tenant_user_id
      if (userId) {
        await supabase.from('leases').update({ tenant_user_id: userId }).eq('id', lease.id);
      }
    }
  }

  // Fallback: case-insensitive email
  if (!lease && email) {
    const { data } = await supabase.from('leases').select('*').ilike('email', email);
    if (data && data.length > 0) {
      lease = data[0];
      if (userId) {
        await supabase.from('leases').update({ tenant_user_id: userId }).eq('id', lease.id);
      }
    }
  }

  return NextResponse.json({ lease });
}
