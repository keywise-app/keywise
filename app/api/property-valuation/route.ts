import { NextResponse } from 'next/server';
import { checkAiLimit } from '../../lib/aiRateLimit';

export async function POST(req: Request) {
  try {
    const { user_id, property } = await req.json();
    if (!user_id || !property) return NextResponse.json({ error: 'user_id and property required' }, { status: 400 });

    const { allowed, reason } = await checkAiLimit(user_id, 'general');
    if (!allowed) return NextResponse.json({ error: 'rate_limit', message: reason }, { status: 429 });

    const prompt = `You are a real estate valuation expert helping a small landlord understand their property's value. Analyze this property data and provide a valuation assessment.

Property Details:
- Address: ${property.address || 'Not provided'}
- Type: ${property.type || 'Residential'}
- Year Built: ${property.year_built || 'Unknown'}
- Bedrooms: ${property.beds || 'Unknown'}
- Bathrooms: ${property.baths || 'Unknown'}
- Square Feet: ${property.sqft || 'Unknown'}
- Current Rent: ${property.current_rent ? '$' + property.current_rent + '/mo' : 'Not set'}
- Monthly Expenses: ${property.monthly_expenses ? '$' + property.monthly_expenses : 'Unknown'}
- Maintenance Issues (recent): ${property.maintenance_count || 0} issues
- Occupancy: ${property.occupied ? 'Occupied' : 'Vacant'}

Return ONLY valid JSON (no markdown):
{
  "estimated_value_low": 0,
  "estimated_value_high": 0,
  "estimated_monthly_rent": 0,
  "rent_assessment": "below_market|at_market|above_market",
  "rent_difference_pct": 0,
  "cap_rate": 0,
  "gross_rent_multiplier": 0,
  "cash_on_cash_note": "brief note about returns",
  "condition_score": 85,
  "condition_factors": ["factor 1", "factor 2"],
  "value_drivers": ["what adds value"],
  "value_risks": ["what reduces value"],
  "recommendations": [
    {"action": "specific action", "impact": "expected impact", "priority": "high|medium|low"}
  ],
  "market_notes": "brief local market context based on property type and location"
}

Base your estimates on typical US residential real estate metrics for the property type and location. Use the rent-to-value ratio (typically 0.5%-1% monthly rent to property value), cap rates (4-8% for residential), and gross rent multipliers (8-15x). If data is limited, provide wider ranges and note the uncertainty. Be realistic — don't inflate values.`;

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
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error?.type === 'rate_limit_error' || response.status === 429) {
        return NextResponse.json({ error: 'rate_limit', message: 'AI rate limit. Please wait and try again.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'ai_error', message: 'Failed to generate valuation.' }, { status: 500 });
    }

    const text = data.content[0].text;
    const cleaned = text.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: 'parse_error', message: 'Failed to parse valuation.' }, { status: 500 });
    }

    return NextResponse.json({ result: JSON.parse(match[0]) });
  } catch (err) {
    console.error('Property valuation error:', err);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error.' }, { status: 500 });
  }
}
