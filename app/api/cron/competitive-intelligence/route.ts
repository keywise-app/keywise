import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { proposeToQueue } from '@/agent-tools/pipeline/propose';

export const runtime = 'nodejs';
export const maxDuration = 120;

async function runIntelligence(supabase: any) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `You are a product strategist for Keywise, an AI property management SaaS for small landlords ($49/mo, free for 1-2 units).

Search the web for:
1. Recent updates from competitors: Buildium, AppFolio, Innago, DoorLoop, Baselane, TurboTenant, Rentec Direct
2. New proptech startups or AI property management tools launched recently
3. Landlord complaints and feature requests on Reddit r/landlord, r/realestateinvesting, BiggerPockets
4. Property management software news and trends

Keywise features: AI lease PDF extraction, online rent collection via Stripe, document signing, move-in/out inspections, tenant portal with auto-pay, AI communications, maintenance tracking, expense tracking, monthly snapshot emails, admin dashboard.

IMPORTANT: Return ONLY a valid JSON object. No markdown, no code blocks, no explanations. Start your response with { and end with }. Keep descriptions concise (under 100 chars each).

{
  "summary": "2-3 sentence executive summary",
  "urgent": [{"title": "", "description": "", "competitor": "", "priority": "high", "effort": "low", "type": "defensive"}],
  "opportunities": [{"title": "", "description": "", "source": "", "priority": "medium", "effort": "medium", "type": "feature"}],
  "trends": [{"title": "", "description": "", "impact": "medium"}],
  "competitor_updates": [{"competitor": "", "update": "", "threat_level": "medium"}]
}`
      }],
    }),
  });

  const result = await response.json();
  console.error('[intelligence] Response status:', response.status);
  console.error('[intelligence] Content blocks:', result.content?.length, result.content?.map((c: any) => c.type));

  const textBlock = result.content?.filter((c: any) => c.type === 'text').pop();
  console.error('[intelligence] Text preview:', (textBlock?.text || '').slice(0, 300));

  let intelligence: any = {};
  try {
    const raw = textBlock?.text || '{}';
    // Remove markdown code blocks
    let cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    // Extract JSON object from surrounding text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];
    intelligence = JSON.parse(cleaned);
  } catch (err: any) {
    console.error('[intelligence] Parse error:', err.message);
    console.error('[intelligence] Raw text:', (textBlock?.text || '').slice(0, 500));
    intelligence = {
      summary: 'Intelligence report generated but could not be parsed. Raw response saved in logs.',
      urgent: [], opportunities: [], trends: [], competitor_updates: [],
    };
  }

  // Save report
  const { data: report } = await supabase.from('intelligence_reports').insert({
    date: new Date().toISOString().split('T')[0],
    summary: intelligence.summary,
    urgent: intelligence.urgent || [],
    opportunities: intelligence.opportunities || [],
    trends: intelligence.trends || [],
    competitor_updates: intelligence.competitor_updates || [],
    status: 'new',
  }).select().single();

  // Mirror each urgent + opportunity item into build_queue.
  // 'defensive' items → feature (we need to ship a counter); everything else
  // gets categorized by `type` if available, otherwise defaults to 'feature'.
  type IntelItem = {
    title?: string;
    description?: string;
    competitor?: string;
    source?: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    type?: string;
    effort?: string;
  };
  const mirror = async (items: IntelItem[] | undefined, defaultPriority: 'high' | 'medium') => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      const title = (item.title || '').trim();
      if (!title) continue;
      const t = (item.type || '').toLowerCase();
      const category: 'feature' | 'marketing' | 'bug' =
        t === 'marketing' || t === 'campaign' || t === 'content'
          ? 'marketing'
          : t === 'bug' || t === 'defect'
            ? 'bug'
            : 'feature';
      try {
        await proposeToQueue({
          title,
          description:
            (item.description || '') +
            (item.competitor ? `\n\nCompetitor: ${item.competitor}` : '') +
            (item.source ? `\n\nSource: ${item.source}` : '') +
            (item.effort ? `\n\nEstimated effort: ${item.effort}` : ''),
          sourceAgent: 'competitive_intel',
          category,
          priority: item.priority || defaultPriority,
          rationale:
            item.competitor
              ? `Competitive intel — ${item.competitor}`
              : 'Competitive intel daily report',
        });
      } catch (e) {
        console.error('[competitive-intel] build_queue mirror failed:', e);
      }
    }
  };
  await mirror(intelligence.urgent, 'high');
  await mirror(intelligence.opportunities, 'medium');

  // Daily digest email intentionally removed -- results are in intelligence_reports / the admin dashboard.

  return { success: true, report_id: report?.id, intelligence };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) {
    // Allow admin users to trigger manually
    const { requireAdminApi } = await import('@/lib/admin-auth');
    const denied = await requireAdminApi(req as any);
    if (denied) return denied;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const result = await runIntelligence(supabase);
  return NextResponse.json(result);
}

export { runIntelligence };
