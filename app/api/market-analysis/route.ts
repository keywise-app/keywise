import { NextResponse } from 'next/server';
import { checkAiLimit } from '../../lib/aiRateLimit';

export async function POST(req: Request) {
  try {
    const { user_id, property, current_rent, beds, baths, sqft } = await req.json();
    if (!property) return NextResponse.json({ error: 'property required' }, { status: 400 });

    if (user_id) {
      const { allowed, reason } = await checkAiLimit(user_id, 'general');
      if (!allowed) return NextResponse.json({ error: 'rate_limit', message: reason }, { status: 429 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `You are a rental market analyst. Estimate fair market rent for this property based on typical US rental rates for the property type, location, and size.

Property: ${property}
Current Rent: $${current_rent || 0}/month
Bedrooms: ${beds || 'Unknown'}
Bathrooms: ${baths || 'Unknown'}
Square Feet: ${sqft || 'Unknown'}

Using your knowledge of US rental markets, estimate the fair market rent. Consider the city, neighborhood, property size, and current market conditions.

Return ONLY valid JSON (no markdown):
{
  "estimated_market_rent": 2400,
  "market_rent_low": 2200,
  "market_rent_high": 2600,
  "current_rent_position": "below_market",
  "recommended_rent": 2400,
  "rent_difference": 200,
  "rent_difference_pct": 9,
  "neighborhood_trends": "Brief 2-sentence summary of rental trends in this area",
  "recommendations": "Brief recommendation for the landlord",
  "data_confidence": "medium"
}

current_rent_position should be "below_market", "at_market", or "above_market".
Be realistic. If you lack specific data for the location, note that in data_confidence.`,
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
