import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `You are a product strategist for Keywise, an AI property management SaaS for small landlords ($19/mo, free for 1-2 units).

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

  // Send email
  const urgentItems = intelligence.urgent || [];
  const opportunities = intelligence.opportunities || [];
  const updates = intelligence.competitor_updates || [];
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const html = `<html><body style="font-family:Arial;background:#F0F4FF;padding:40px 20px;"><div style="max-width:600px;margin:0 auto;">
<div style="background:#0F3460;border-radius:12px 12px 0 0;padding:24px 32px;"><div style="color:#00D4AA;font-size:20px;font-weight:700;">keywise</div><div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;">Daily Intelligence — ${dateStr}</div></div>
<div style="background:white;padding:24px 32px;border-bottom:1px solid #E0E6F0;"><div style="color:#0F3460;font-weight:700;font-size:16px;margin-bottom:8px;">Executive Summary</div><p style="color:#4A5068;font-size:14px;line-height:1.6;margin:0;">${intelligence.summary || 'No summary available.'}</p></div>
${urgentItems.length > 0 ? `<div style="background:white;padding:24px 32px;border-bottom:1px solid #E0E6F0;"><div style="color:#CC0000;font-weight:700;font-size:15px;margin-bottom:16px;">Urgent Actions (${urgentItems.length})</div>${urgentItems.map((i: any) => `<div style="background:#FFF0F0;border-left:3px solid #FF4444;border-radius:8px;padding:14px 16px;margin-bottom:12px;"><div style="font-weight:700;color:#0F3460;font-size:14px;margin-bottom:4px;">${i.title}</div><div style="color:#4A5068;font-size:13px;">${i.description}</div></div>`).join('')}</div>` : ''}
${opportunities.length > 0 ? `<div style="background:white;padding:24px 32px;border-bottom:1px solid #E0E6F0;"><div style="color:#9A6500;font-weight:700;font-size:15px;margin-bottom:16px;">Opportunities (${opportunities.length})</div>${opportunities.map((i: any) => `<div style="background:#FFF8E0;border-left:3px solid #FFB347;border-radius:8px;padding:14px 16px;margin-bottom:12px;"><div style="font-weight:700;color:#0F3460;font-size:14px;margin-bottom:4px;">${i.title}</div><div style="color:#4A5068;font-size:13px;">${i.description}</div></div>`).join('')}</div>` : ''}
${updates.length > 0 ? `<div style="background:white;padding:24px 32px;border-bottom:1px solid #E0E6F0;"><div style="color:#0F3460;font-weight:700;font-size:15px;margin-bottom:16px;">Competitor Updates</div>${updates.map((i: any) => `<div style="padding:10px 0;border-bottom:1px solid #F0F4FF;"><div style="font-weight:700;color:#0F3460;font-size:13px;">${i.competitor}</div><div style="color:#4A5068;font-size:13px;margin-top:4px;">${i.update}</div></div>`).join('')}</div>` : ''}
<div style="background:white;padding:24px 32px;border-radius:0 0 12px 12px;text-align:center;"><a href="https://keywise.app/admin" style="background:#0F3460;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View in Admin</a><p style="color:#8892A4;font-size:12px;margin-top:16px;">Keywise Intelligence · Claude AI</p></div>
</div></body></html>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'Keywise Intelligence <noreply@keywise.app>',
    to: 'cccolwell@gmail.com',
    subject: `Daily Intelligence — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
    html,
  });

  return { success: true, report_id: report?.id, intelligence };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const result = await runIntelligence(supabase);
  return NextResponse.json(result);
}

export { runIntelligence };
