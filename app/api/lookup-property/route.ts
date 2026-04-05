import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address) return NextResponse.json({ error: 'No address provided' }, { status: 400 });

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
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search Zillow, Redfin, or county assessor records for this property: "${address}". Find: year built, square footage, number of bedrooms, bathrooms, property type. Return ONLY valid JSON: {"year_built":null,"sqft":null,"beds":null,"baths":null,"property_type":null,"num_units":null}. No other text.`,
        }],
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[lookup-property] Anthropic error:', result);
      return NextResponse.json({ error: 'API error', details: result }, { status: 500 });
    }

    // Extract text from the last text content block
    const textBlock = result.content?.filter((c: any) => c.type === 'text').pop();
    const text = textBlock?.text || '{}';
    const cleaned = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      const hasData = Object.values(parsed).some(v => v !== null && v !== undefined);
      return NextResponse.json(hasData ? { found: true, data: parsed } : { found: false });
    } catch {
      console.error('[lookup-property] JSON parse failed, raw text:', text);
      return NextResponse.json({ found: false });
    }
  } catch (err: any) {
    console.error('[lookup-property] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Lookup failed' }, { status: 500 });
  }
}
