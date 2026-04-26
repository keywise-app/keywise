import { NextResponse } from 'next/server';
import { checkAiLimit } from '../../lib/aiRateLimit';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { user_id, tenant_name, property, rent, lease_end, tenant_message, maintenance_context, message_history } = await req.json();
    if (!user_id || !tenant_message) return NextResponse.json({ error: 'user_id and tenant_message required' }, { status: 400 });

    const { allowed, reason } = await checkAiLimit(user_id, 'message_draft');
    if (!allowed) return NextResponse.json({ error: 'rate_limit', message: reason }, { status: 429 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get landlord profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone, company')
      .eq('id', user_id)
      .single();

    const signature = [
      profile?.full_name || 'Property Manager',
      profile?.company || '',
      profile?.phone || '',
      profile?.email || '',
    ].filter(Boolean).join('\n');

    // Get recent maintenance for context
    let maintenanceNotes = maintenance_context || '';
    if (!maintenanceNotes && property) {
      const { data: maint } = await supabase
        .from('maintenance')
        .select('issue, status, category, priority, notes')
        .ilike('property', `%${property.split(',')[0]}%`)
        .neq('status', 'resolved')
        .limit(5);
      if (maint && maint.length > 0) {
        maintenanceNotes = 'Open maintenance issues:\n' + maint.map(m => `- ${m.issue} (${m.status}, ${m.priority})`).join('\n');
      }
    }

    const historyContext = (message_history || []).slice(-6).map((m: any) =>
      `${m.direction === 'incoming' ? 'Tenant' : 'Landlord'}: ${m.text}`
    ).join('\n');

    const prompt = `You are a professional property manager's AI assistant. Draft a reply to this tenant message.

Landlord: ${signature}
Tenant: ${tenant_name || 'Tenant'}
Property: ${property || 'Not specified'}
Rent: ${rent ? '$' + rent + '/mo' : 'Not specified'}
Lease ends: ${lease_end || 'Not specified'}
Today: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

${maintenanceNotes ? maintenanceNotes + '\n' : ''}
${historyContext ? 'Recent conversation:\n' + historyContext + '\n' : ''}
Tenant's message: "${tenant_message}"

Draft a professional, helpful reply. Be warm but concise. If the message relates to maintenance, reference any open issues. If it's about rent or lease terms, reference the lease data. Sign with the landlord's first name only.

Also classify the message. Return ONLY valid JSON (no markdown):
{
  "reply": "the drafted reply text",
  "category": "maintenance|rent|lease|general|complaint|request|emergency",
  "urgency": "low|medium|high",
  "suggested_actions": ["action 1", "action 2"],
  "sentiment": "positive|neutral|negative"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (data.error?.type === 'rate_limit_error' || response.status === 429) {
        return NextResponse.json({ error: 'rate_limit', message: 'AI rate limit. Please wait.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'ai_error', message: 'Failed to generate reply.' }, { status: 500 });
    }

    const text = data.content[0].text;
    const cleaned = text.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      // Fallback: return raw text as reply
      return NextResponse.json({ result: { reply: text, category: 'general', urgency: 'low', suggested_actions: [], sentiment: 'neutral' } });
    }

    return NextResponse.json({ result: JSON.parse(match[0]) });
  } catch (err) {
    console.error('Smart reply error:', err);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error.' }, { status: 500 });
  }
}
