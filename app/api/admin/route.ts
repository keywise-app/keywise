import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PLATFORM_FEE_DOLLARS = parseInt(process.env.KEYWISE_PLATFORM_FEE || '200', 10) / 100;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();

// Bot / crawler / uptime-monitor user agents — Google Ads' own verification
// crawlers were a large chunk of page_views, so traffic numbers need this
// filter to mean anything.
const BOT_UA = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|google-adwords|adsbot|google-inspectiontool|googleother|pingdom|uptimerobot|headlesschrome|phantomjs|lighthouse|mediapartners-google|^curl\/|python-requests|axios\//i;

// price_tier values are self-describing: "founding_29" -> $29/mo,
// "standard_49" -> $49/mo, "annual_390" -> $390/yr -> $32.50/mo.
function tierMonthlyAmount(tier: string | null): number | null {
  if (!tier) return null;
  const n = Number(tier.split('_').pop());
  if (isNaN(n)) return null;
  return tier.startsWith('annual_') ? n / 12 : n;
}

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

      // price_tier only exists after supabase/migrations/20260822000000_dashboard_schema_fixes.sql
      // has been run — fall back to a query without it so a forgotten migration degrades to
      // "can't classify MRR by tier" rather than silently reporting zero customers.
      let allProfilesRes = await supabase
        .from('profiles')
        .select('id, email, full_name, subscription_status, price_tier, created_at, trial_ends_at');
      if (allProfilesRes.error) {
        allProfilesRes = await supabase
          .from('profiles')
          .select('id, email, full_name, subscription_status, created_at, trial_ends_at');
      }

      const [
        paidPaymentsRes, paidVolumeRes, monthPaidRes, feeEligibleRes, feeEligibleMonthRes,
        docsRes, inspectionsRes, leasesRes,
        buildingsRes, unitsRes, activeLeasesRes,
        pendingPaymentsRes, overduePaymentsRes,
        feedbackRes,
        pageViewsRes,
      ] = await Promise.all([
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('payments').select('amount').eq('status', 'paid'),
        supabase.from('payments').select('amount').eq('status', 'paid').gte('created_at', monthStart),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'paid').ilike('method', '%stripe%'),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'paid').ilike('method', '%stripe%').gte('created_at', monthStart),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('leases').select('id', { count: 'exact', head: true }),
        supabase.from('buildings').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_unit', true),
        supabase.from('leases').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabase.from('feedback').select('*').order('created_at', { ascending: false }),
        supabase.from('page_views').select('page, referrer, user_agent, date').gte('date', new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]),
      ]);

      // Exclude the founder's own dogfooding account from every customer-facing number.
      const customers = (allProfilesRes.data || []).filter(
        (p: any) => (p.email || '').toLowerCase() !== ADMIN_EMAIL
      );
      const totalCustomers = customers.length;
      const trialCustomers = customers.filter((p: any) => p.subscription_status === 'trial');
      const activeCustomers = customers.filter((p: any) => p.subscription_status === 'active');
      const cancelledCustomers = customers.filter((p: any) => p.subscription_status === 'cancelled');
      const newWeek = customers.filter((p: any) => p.created_at >= weekAgo).length;
      const newMonth = customers.filter((p: any) => p.created_at >= monthAgo).length;
      const newToday = customers.filter((p: any) => p.created_at >= todayStart).length;

      let mrr = 0;
      let unclassifiedActive = 0;
      for (const p of activeCustomers) {
        const amt = tierMonthlyAmount(p.price_tier);
        if (amt === null) unclassifiedActive++;
        else mrr += amt;
      }

      const trialPipeline = trialCustomers
        .map((p: any) => ({
          id: p.id,
          name: p.full_name || null,
          email: p.email,
          created_at: p.created_at,
          trial_ends_at: p.trial_ends_at,
          daysLeft: p.trial_ends_at
            ? Math.ceil((new Date(p.trial_ends_at).getTime() - now.getTime()) / 86400000)
            : null,
        }))
        .sort((a: any, b: any) => {
          if (a.daysLeft === null) return 1;
          if (b.daysLeft === null) return -1;
          return a.daysLeft - b.daysLeft;
        });

      const totalVolume = (paidVolumeRes.data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const monthVolume = (monthPaidRes.data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);

      // ── Traffic, with obvious bots/crawlers filtered out ──
      const humanViews = (pageViewsRes.data || []).filter((v: any) => !BOT_UA.test(v.user_agent || ''));
      const todayStr = now.toISOString().split('T')[0];
      const weekAgoStr = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
      const weekViews = humanViews.filter((v: any) => v.date >= weekAgoStr);

      const byDay: Record<string, number> = {};
      for (const v of weekViews) byDay[v.date] = (byDay[v.date] || 0) + 1;

      const byRef: Record<string, number> = {};
      for (const v of weekViews) {
        let ref = v.referrer || 'direct';
        if (ref.includes('google')) ref = 'Google';
        else if (ref.includes('reddit')) ref = 'Reddit';
        else if (ref.includes('facebook') || ref.includes('fb.')) ref = 'Facebook';
        else if (ref.includes('twitter') || ref.includes('x.com')) ref = 'Twitter/X';
        else if (ref === 'direct' || ref === '') ref = 'Direct';
        else {
          try { ref = ref.length > 30 ? new URL(ref).hostname : ref; } catch { /* leave as-is */ }
        }
        byRef[ref] = (byRef[ref] || 0) + 1;
      }
      const topRefs = Object.entries(byRef).sort((a, b) => b[1] - a[1]).slice(0, 8);

      const isFunnelPage = (page: string) =>
        /ab1482-calculator|eviction-notice|\/compliance/i.test(page || '');
      const funnelViewsWeek = weekViews.filter((v: any) => isFunnelPage(v.page)).length;
      const funnelViewsToday = weekViews.filter((v: any) => v.date === todayStr && isFunnelPage(v.page)).length;

      return NextResponse.json({
        users: {
          total: totalCustomers,
          newToday, newWeek, newMonth,
          trial: trialCustomers.length,
          active: activeCustomers.length,
          cancelled: cancelledCustomers.length,
        },
        trialPipeline,
        revenue: {
          mrr: Math.round(mrr * 100) / 100,
          unclassifiedActive,
          rentVolumeTotal: totalVolume,
          rentVolumeMonth: monthVolume,
          platformFeesTotal: (feeEligibleRes.count || 0) * PLATFORM_FEE_DOLLARS,
          platformFeesMonth: (feeEligibleMonthRes.count || 0) * PLATFORM_FEE_DOLLARS,
          paymentsCompleted: paidPaymentsRes.count || 0,
        },
        traffic: {
          today: humanViews.filter((v: any) => v.date === todayStr).length,
          week: weekViews.length,
          byDay,
          topRefs,
          funnelViewsToday,
          funnelViewsWeek,
        },
        product: {
          documents: docsRes.count || 0,
          inspectionsCompleted: inspectionsRes.count || 0,
          totalLeases: leasesRes.count || 0,
          buildings: buildingsRes.count || 0,
          units: unitsRes.count || 0,
          activeLeases: activeLeasesRes.count || 0,
          pendingRentPayments: pendingPaymentsRes.count || 0,
          overdueRentPayments: overduePaymentsRes.count || 0,
        },
        feedback: feedbackRes.data || [],
      });
    }

    if (action === 'update_feedback') {
      const { id, status, admin_notes } = payload;
      const { error } = await supabase.from('feedback').update({ status, admin_notes }).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'tools_data') {
      const [broadcastsRes, intelRes] = await Promise.all([
        supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('intelligence_reports').select('*').order('date', { ascending: false }).limit(7),
      ]);
      return NextResponse.json({
        broadcasts: broadcastsRes.data || [],
        intelReports: intelRes.data || [],
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[admin] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
