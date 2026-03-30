import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
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
      console.error('Anthropic error:', data);
      return NextResponse.json({ result: 'API Error: ' + JSON.stringify(data) });
    }

    const result = data.content[0].text;
    return NextResponse.json({ result });
  } catch (err) {
    console.error('Route error:', err);
    return NextResponse.json({ result: 'Error: ' + String(err) });
  }
}