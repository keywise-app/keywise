import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getLimits } from '../../lib/planLimits';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [profileRes, unitRes, buildingRes] = await Promise.all([
    supabase.from('profiles').select('subscription_status').eq('id', user.id).single(),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_unit', true),
    supabase.from('buildings').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  const status = profileRes.data?.subscription_status ?? 'free';
  const limits = getLimits(status);
  const unitCount = unitRes.count ?? 0;
  const buildingCount = buildingRes.count ?? 0;

  return NextResponse.json({
    status,
    unitCount,
    buildingCount,
    maxUnits: limits.maxUnits,
    maxBuildings: limits.maxBuildings,
    canAddUnit: unitCount < limits.maxUnits,
    canAddBuilding: buildingCount < limits.maxBuildings,
    onlinePayments: limits.onlinePayments,
  });
}
