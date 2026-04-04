import { NextResponse } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (limit && now < limit.resetTime) {
    if (limit.count >= 20) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }
    limit.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
  }

  try {
    const { prompt, max_tokens } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    if (prompt.length > 10000) {
      return NextResponse.json({ error: 'Prompt exceeds maximum length of 10,000 characters.' }, { status: 400 });
    }

    // Strip common prompt injection attempts
    const sanitized = prompt
      .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, '')
      .replace(/disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, '')
      .replace(/forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, '')
      .replace(/you\s+are\s+now\s+(?:a|an)\s+/gi, '')
      .replace(/new\s+instructions?:/gi, '')
      .trim();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: Math.min(max_tokens || 500, 1024),
        messages: [{ role: 'user', content: sanitized }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', data);
      if (data.error?.type === 'rate_limit_error' || response.status === 429) {
        return NextResponse.json({
          result: null,
          error: 'rate_limit',
          message: 'Too many requests. Please wait 30 seconds and try again.',
        });
      }
      return NextResponse.json({ result: 'API Error: ' + JSON.stringify(data) });
    }

    const result = data.content[0].text;
    return NextResponse.json({ result });
  } catch (err) {
    console.error('Route error:', err);
    return NextResponse.json({ result: 'Error: ' + String(err) });
  }
}
