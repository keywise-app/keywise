import { NextResponse } from 'next/server';
import { checkAiLimit } from '../../lib/aiRateLimit';

export async function POST(req: Request) {
  try {
    const {
      user_id, property, current_rent, beds, baths, sqft, differentiators,
      improvements, issues, localContext, tenantNotes, knownComps, pricingStrategy,
    } = await req.json();
    if (!property) return NextResponse.json({ error: 'property required' }, { status: 400 });

    if (user_id) {
      const { allowed, reason } = await checkAiLimit(user_id, 'general');
      if (!allowed) return NextResponse.json({ error: 'rate_limit', message: reason }, { status: 429 });
    }

    const userContext = [
      improvements ? `Recent improvements: ${improvements}` : '',
      issues ? `Known issues: ${issues}` : '',
      localContext ? `Local context: ${localContext}` : '',
      tenantNotes ? `Tenant quality: ${tenantNotes}` : '',
      knownComps ? `Comparable rentals the landlord knows about:\n${knownComps}` : '',
      pricingStrategy ? `Pricing strategy: ${pricingStrategy}` : '',
    ].filter(Boolean).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250620',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are a rental market analyst helping a landlord set fair rent. Estimate fair market rent for this property.

Property: ${property}
Current Rent: $${current_rent || 0}/month
Bedrooms: ${beds || 'Unknown'}
Bathrooms: ${baths || 'Unknown'}
Square Feet: ${sqft || 'Unknown'}
${differentiators ? `Features: ${differentiators}` : ''}
${userContext ? `\nLANDLORD-PROVIDED CONTEXT:\n${userContext}` : ''}

Consider the city, neighborhood, property size, current 2026 market conditions, unique features, and any landlord-provided context. Weight landlord context appropriately — improvements add value, known issues reduce it, local context affects demand, tenant quality may justify retention pricing.
${pricingStrategy === 'Retain tenant' ? '\nThe landlord prioritizes tenant retention — recommend a rent that keeps a good tenant while being reasonable.' : ''}
${pricingStrategy === 'Maximize revenue' ? '\nThe landlord wants to maximize revenue — recommend market rate or above if justified by features.' : ''}

Return ONLY valid JSON (no markdown):
{
  "estimated_market_rent": 2400,
  "market_rent_low": 2200,
  "market_rent_high": 2600,
  "current_rent_position": "below_market",
  "recommended_rent": 2400,
  "rent_difference": 200,
  "rent_difference_pct": 9,
  "differentiator_premium": 150,
  "neighborhood_trends": "2-sentence summary of rental trends in this area",
  "demand_indicator": "high",
  "recommendations": "Specific recommendation for the landlord",
  "data_confidence": "medium",
  "confidence_reasoning": "Why this confidence level — what data was available vs missing",
  "reasoning": ["Bullet 1: key factor", "Bullet 2: key factor", "Bullet 3: key factor"],
  "analysis_date": "${new Date().toISOString().split('T')[0]}"
}

current_rent_position: "below_market", "at_market", or "above_market".
demand_indicator: "high", "medium", or "low".
data_confidence: "high" (strong local data), "medium" (reasonable estimate), "low" (limited data).
reasoning: 3-5 bullet points explaining the key factors that determined this estimate.
Be realistic — don't inflate values.`,
        }],
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      if (result.error?.type === 'rate_limit_error' || response.status === 429) {
        return NextResponse.json({ error: 'rate_limit' }, { status: 429 });
      }
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    const text = result.content?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'Could not parse analysis' }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (err) {
    console.error('Market analysis error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
