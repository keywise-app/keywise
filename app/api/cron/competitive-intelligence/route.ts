import { runIntelligence } from '@/lib/intelligence/daily';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const isCron = Boolean(process.env.CRON_SECRET) && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) {
    // Allow admin users to trigger manually
    const { requireAdminApi } = await import('@/lib/admin-auth');
    const denied = await requireAdminApi(req as any);
    if (denied) return denied;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const result = await runIntelligence(supabase, isCron ? 'cron' : 'admin-get');
    return NextResponse.json(result);
  } catch (error) {
    console.error('[intelligence] run failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ success: false, error: 'Intelligence pipeline failed; inspect server logs.' }, { status: 502 });
  }
}
