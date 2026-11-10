import { randomUUID } from 'node:crypto';
import { Resend } from 'resend';
import { computeDedupeHash } from '@/agent-tools/pipeline/propose';
import { escapeHtml, generateIntelligence, type Intelligence } from '@/lib/intelligence/generate';

const recipient = 'cccolwell@gmail.com';

function generate(reportDay: string) {
  return generateIntelligence(`You are a product strategist for Keywise, an AI property management SaaS for small landlords ($49/mo, free for 1-2 units).

Today is ${reportDay}. Search for recent, verifiable information. Do not invent updates or sources. Cite source URLs in descriptions or source fields. Empty categories are acceptable when no credible findings exist.

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
}`, process.env.ANTHROPIC_API_KEY || '');
}

function proposals(report: Intelligence) {
  return (['urgent', 'opportunities'] as const).flatMap(group => report[group].map(item => {
    const title = item.title.trim();
    const type = (item.type || '').toLowerCase();
    const category = ['marketing', 'campaign', 'content'].includes(type) ? 'marketing'
      : ['bug', 'defect'].includes(type) ? 'bug' : 'feature';
    const description = [item.description, item.competitor && `Competitor: ${item.competitor}`,
      item.source && `Source: ${item.source}`, item.effort && `Estimated effort: ${item.effort}`]
      .filter(Boolean).join('\n\n');
    return {
      title, description, category, dedupe_hash: computeDedupeHash(title, category),
      priority: item.priority || (group === 'urgent' ? 'high' : 'medium'),
      rationale: item.competitor ? `Competitive intel — ${item.competitor}` : 'Competitive intel daily report',
    };
  }));
}

function renderEmail(intelligence: Intelligence, reportDay: string) {
  const date = new Date(reportDay + 'T12:00:00Z');
  const urgentItems = intelligence.urgent || [];
  const opportunities = intelligence.opportunities || [];
  const updates = intelligence.competitor_updates || [];
  const dateStr = date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });

  const html = `<html><body style="font-family:Arial;background:#F0F4FF;padding:40px 20px;"><div style="max-width:600px;margin:0 auto;">
<div style="background:#0F3460;border-radius:12px 12px 0 0;padding:24px 32px;"><div style="color:#00D4AA;font-size:20px;font-weight:700;">keywise</div><div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;">Daily Intelligence — ${dateStr}</div></div>
<div style="background:white;padding:24px 32px;border-bottom:1px solid #E0E6F0;"><div style="color:#0F3460;font-weight:700;font-size:16px;margin-bottom:8px;">Executive Summary</div><p style="color:#4A5068;font-size:14px;line-height:1.6;margin:0;">${escapeHtml(intelligence.summary)}</p></div>
${urgentItems.length > 0 ? `<div style="background:white;padding:24px 32px;border-bottom:1px solid #E0E6F0;"><div style="color:#CC0000;font-weight:700;font-size:15px;margin-bottom:16px;">Urgent Actions (${urgentItems.length})</div>${urgentItems.map((i: any) => `<div style="background:#FFF0F0;border-left:3px solid #FF4444;border-radius:8px;padding:14px 16px;margin-bottom:12px;"><div style="font-weight:700;color:#0F3460;font-size:14px;margin-bottom:4px;">${escapeHtml(i.title)}</div><div style="color:#4A5068;font-size:13px;">${escapeHtml(i.description)}</div></div>`).join('')}</div>` : ''}
${opportunities.length > 0 ? `<div style="background:white;padding:24px 32px;border-bottom:1px solid #E0E6F0;"><div style="color:#9A6500;font-weight:700;font-size:15px;margin-bottom:16px;">Opportunities (${opportunities.length})</div>${opportunities.map((i: any) => `<div style="background:#FFF8E0;border-left:3px solid #FFB347;border-radius:8px;padding:14px 16px;margin-bottom:12px;"><div style="font-weight:700;color:#0F3460;font-size:14px;margin-bottom:4px;">${escapeHtml(i.title)}</div><div style="color:#4A5068;font-size:13px;">${escapeHtml(i.description)}</div></div>`).join('')}</div>` : ''}
${updates.length > 0 ? `<div style="background:white;padding:24px 32px;border-bottom:1px solid #E0E6F0;"><div style="color:#0F3460;font-weight:700;font-size:15px;margin-bottom:16px;">Competitor Updates</div>${updates.map((i: any) => `<div style="padding:10px 0;border-bottom:1px solid #F0F4FF;"><div style="font-weight:700;color:#0F3460;font-size:13px;">${escapeHtml(i.competitor)}</div><div style="color:#4A5068;font-size:13px;margin-top:4px;">${escapeHtml(i.update)}</div></div>`).join('')}</div>` : ''}
<div style="background:white;padding:24px 32px;border-radius:0 0 12px 12px;text-align:center;"><a href="https://keywise.app/admin" style="background:#0F3460;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View in Admin</a><p style="color:#8892A4;font-size:12px;margin-top:16px;">Keywise Intelligence · Claude AI</p></div>
</div></body></html>`;

  return {
    from: 'Keywise Intelligence <noreply@keywise.app>',
    to: recipient,
    subject: `Daily Intelligence — ${date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' })}`,
    html,
  };
}

type Trigger = 'cron' | 'admin-get' | 'admin-post';

export async function runIntelligence(db: any, trigger: Trigger, requestedDay?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const day = requestedDay ?? today;
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today ||
      new Date(day + 'T00:00:00Z').toJSON()?.slice(0, 10) !== day) {
    throw new Error('invalid_intelligence_day');
  }
  const project = process.env.VERCEL_PROJECT_ID;
  const owner = process.env.INTELLIGENCE_OWNER_PROJECT_ID;
  const context = { project, deployment: process.env.VERCEL_DEPLOYMENT_ID, trigger, day };
  if (process.env.VERCEL_ENV !== 'production' || !owner || project !== owner) {
    console.info('[intelligence] sender disabled', context);
    return { success: true, state: 'disabled' };
  }
  if (!process.env.RESEND_API_KEY) throw new Error('missing_resend_key');
  const token = randomUUID();
  const step = async (name: string, args = {}) => {
    const { data, error } = await db.rpc('daily_intelligence_step', {
      p_day: day, p_recipient: recipient, p_token: token, p_step: name, p_args: args,
    });
    if (error || !data) throw new Error(`intelligence_${name}_failed:${error?.code ?? 'no_result'}`);
    return data;
  };
  const claim = await step('claim', { existing_only: day !== today });
  console.info('[intelligence] claim', { ...context, state: claim.state, report_id: claim.report_id, provider_id: claim.provider_id });
  if (claim.state === 'reconcile') throw new Error('intelligence_delivery_requires_reconciliation');
  if (claim.state === 'busy' || claim.state === 'accepted') {
    return { success: true, state: claim.state, report_id: claim.report_id };
  }
  if (claim.state !== 'claimed') throw new Error('unknown_intelligence_claim');
  try {
    let prepared = claim;
    let intelligence: Intelligence | undefined;
    if (!prepared.payload) {
      intelligence = await generate(day);
      prepared = await step('prepare', {
        report: intelligence, payload: renderEmail(intelligence, day), proposals: proposals(intelligence),
      });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const idempotencyKey = `daily-intelligence/${day}/${recipient}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { fresh } = await step('attempt');
      let response;
      try {
        response = await resend.emails.send(prepared.payload, { idempotencyKey });
      } catch (error) {
        if (attempt > 0) throw error;
      }
      if (response?.data?.id && !response.error) {
        await step('accepted', { provider_id: response.data.id });
        console.info('[intelligence] accepted', { ...context, report_id: prepared.report_id, provider_id: response.data.id });
        return { success: true, state: 'accepted', report_id: prepared.report_id, intelligence };
      }
      const reason = response?.error?.name;
      if (reason && ['invalid_api_key','missing_api_key','restricted_api_key','validation_error',
        'invalid_from_address','daily_quota_exceeded','monthly_quota_exceeded','rate_limit_exceeded'].includes(reason)) {
        if (fresh) await step('rejected');
        throw new Error(`intelligence_email_failed:${reason}`);
      }
      if (reason === 'invalid_idempotent_request' || attempt > 0) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('intelligence_email_failed:unconfirmed');
  } catch (error) {
    // The lease also expires if this worker dies or the release cannot be persisted.
    await step('release').catch(() => console.error('[intelligence] release failed', context));
    throw error;
  }
}
