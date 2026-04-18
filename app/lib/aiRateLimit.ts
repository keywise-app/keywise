import { createClient } from '@supabase/supabase-js';

const DAILY_LIMITS: Record<string, number> = {
  message_draft: 20,
  lease_extract: 10,
  process_document: 20,
  property_lookup: 5,
  inspection_report: 5,
  maintenance_assess: 10,
  preventive_maintenance: 10,
  general: 30,
};

const MONTHLY_HARD_CAP = 500;
const FLAGGED_DAILY_LIMIT = 10;

export async function checkAiLimit(userId: string, feature: string): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  // Get today's usage
  const { data: usage } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('date', today)
    .single();

  const dailyCount = usage?.count || 0;

  // Check monthly total across all features
  const { data: monthlyData } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('month', month);

  const monthlyTotal = (monthlyData || []).reduce((s: number, r: any) => s + (r.count || 0), 0);

  // Hard monthly cap — restrict to reduced daily limit
  if (monthlyTotal >= MONTHLY_HARD_CAP) {
    const limit = FLAGGED_DAILY_LIMIT;
    if (dailyCount >= limit) {
      return { allowed: false, reason: `Monthly AI limit reached. Restricted to ${limit} requests/day.` };
    }
  }

  // Daily limit per feature
  const limit = DAILY_LIMITS[feature] || DAILY_LIMITS.general;
  if (dailyCount >= limit) {
    return { allowed: false, reason: `Daily limit of ${limit} ${feature.replace(/_/g, ' ')} requests reached. Resets at midnight.` };
  }

  // Increment usage
  if (usage) {
    await supabase.from('ai_usage').update({ count: dailyCount + 1 }).eq('user_id', userId).eq('feature', feature).eq('date', today);
  } else {
    await supabase.from('ai_usage').insert({ user_id: userId, feature, date: today, month, count: 1 });
  }

  return { allowed: true };
}
