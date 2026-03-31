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
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
        }],
        messages: [{
          role: 'user',
          content: `Search for public property information for this address: ${address}. Look on Zillow, Redfin, county assessor records, or any public source. Return ONLY a JSON object with these fields (use null if not found): { "year_built": number, "sqft": number, "beds": number, "baths": number, "property_type": "house/condo/duplex/apartment/townhouse", "num_units": number, "estimated_value": number }. Return only the JSON, no other text.`,
        }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[lookup-property] Anthropic error:', data);
      return NextResponse.json({ error: 'API error', details: data }, { status: 500 });
    }

    // Find the text block in the response (may be after tool_use blocks)
    const textBlock = data.content?.find((b: any) => b.type === 'text');
    if (!textBlock?.text) {
      return NextResponse.json({ found: false });
    }

    // Extract JSON from the response text
    const text = textBlock.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ found: false });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Check if we actually got any useful data
    const hasData = Object.values(parsed).some(v => v !== null && v !== undefined);
    if (!hasData) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({ found: true, data: parsed });
  } catch (err: any) {
    console.error('[lookup-property] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Lookup failed' }, { status: 500 });
  }
}
