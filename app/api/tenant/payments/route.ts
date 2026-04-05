import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leaseId = searchParams.get('lease_id');
  const tenantName = searchParams.get('tenant_name');

  if (!leaseId && !tenantName) {
    return NextResponse.json({ error: 'lease_id or tenant_name required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch by lease_id first, fallback to tenant_name
  let payments: any[] = [];

  if (leaseId) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('lease_id', leaseId)
      .order('due_date', { ascending: false });
    payments = data || [];
  }

  // If no results by lease_id, try tenant_name
  if (payments.length === 0 && tenantName) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_name', tenantName)
      .order('due_date', { ascending: false });
    payments = data || [];
  }

  return NextResponse.json({ payments });
}
