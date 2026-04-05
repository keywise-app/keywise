import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { password, action, payload } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Access denied' }, { status: 401 });
    }

    if (action === 'stats') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        profilesRes, newTodayRes, newWeekRes, newMonthRes,
        proRes, cancelledRes,
        paidPaymentsRes, paidVolumeRes, monthPaidRes,
        docsRes, aiDocsRes, leasesExtractedRes,
        inspectionsRes, leasesRes, invitedRes,
        buildingsRes, unitsRes, activeLeasesRes,
        pendingPaymentsRes, overduePaymentsRes,
        recentSignupsRes, feedbackRes, broadcastsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'cancelled'),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('payments').select('amount').eq('status', 'paid'),
        supabase.from('payments').select('amount').eq('status', 'paid').gte('created_at', monthStart),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('id', { count: 'exact', head: true }).not('summary', 'is', null).neq('summary', ''),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('type', 'lease'),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('leases').select('id', { count: 'exact', head: true }),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('invite_sent', true),
        supabase.from('buildings').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_unit', true),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabase.from('profiles').select('id, full_name, email, created_at, subscription_status').order('created_at', { ascending: false }).limit(20),
        supabase.from('feedback').select('*').order('created_at', { ascending: false }),
        supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      const totalVolume = (paidVolumeRes.data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const monthVolume = (monthPaidRes.data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const totalUsers = profilesRes.count || 0;
      const proUsers = proRes.count || 0;

      // Weekly signups (last 8 weeks)
      const weeklySignups: { week: string; count: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const start = new Date(now.getTime() - (i + 1) * 7 * 86400000);
        const end = new Date(now.getTime() - i * 7 * 86400000);
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
          .gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
        weeklySignups.push({
          week: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: count || 0,
        });
      }

      return NextResponse.json({
        users: {
          total: totalUsers,
          newToday: newTodayRes.count || 0,
          newWeek: newWeekRes.count || 0,
          newMonth: newMonthRes.count || 0,
          pro: proUsers,
          free: totalUsers - proUsers - (cancelledRes.count || 0),
          cancelled: cancelledRes.count || 0,
          weeklySignups,
        },
        revenue: {
          totalPaid: paidPaymentsRes.count || 0,
          totalVolume,
          totalFees: (paidPaymentsRes.count || 0) * 2,
          monthVolume,
          monthFees: (monthPaidRes.data?.length || 0) * 2,
          mrr: proUsers * 29,
        },
        ai: {
          documents: docsRes.count || 0,
          aiSummaries: aiDocsRes.count || 0,
          leasesExtracted: leasesExtractedRes.count || 0,
          inspections: inspectionsRes.count || 0,
          totalLeases: leasesRes.count || 0,
          invited: invitedRes.count || 0,
        },
        system: {
          buildings: buildingsRes.count || 0,
          units: unitsRes.count || 0,
          activeLeases: activeLeasesRes.count || 0,
          pendingPayments: pendingPaymentsRes.count || 0,
          overduePayments: overduePaymentsRes.count || 0,
        },
        recentSignups: recentSignupsRes.data || [],
        feedback: feedbackRes.data || [],
        broadcasts: broadcastsRes.data || [],
        aiUsage: await (async () => {
          const today = new Date().toISOString().split('T')[0];
          const { data: todayUsage } = await supabase.from('ai_usage').select('feature, count, user_id').eq('date', today);
          const totalToday = (todayUsage || []).reduce((s: number, r: any) => s + (r.count || 0), 0);
          const byUser: Record<string, number> = {};
          for (const r of todayUsage || []) { byUser[r.user_id] = (byUser[r.user_id] || 0) + (r.count || 0); }
          const topUsers = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ user_id: id, count }));
          return { totalToday, topUsers, entries: todayUsage?.length || 0 };
        })(),
      });
    }

    if (action === 'update_feedback') {
      const { id, status, admin_notes } = payload;
      const { error } = await supabase.from('feedback').update({ status, admin_notes }).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[admin] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
