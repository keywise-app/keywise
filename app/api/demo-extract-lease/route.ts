import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const runtime = 'nodejs';

// IP-based rate limiting: max 3 demos per hour per IP
const demoLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const limit = demoLimitMap.get(ip);

  if (limit && now < limit.resetTime) {
    if (limit.count >= 3) {
      return NextResponse.json({ error: 'Demo limit reached. Sign up for unlimited extractions.' }, { status: 429 });
    }
    limit.count++;
  } else {
    demoLimitMap.set(ip, { count: 1, resetTime: now + 3600000 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      return NextResponse.json({ error: 'Please upload a PDF or image file.' }, { status: 400 });
    }

    const content: any[] = [];
    if (isImage) {
      content.push({ type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } });
    } else {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } });
    }

    content.push({
      type: 'text',
      text: `Extract all available information from this lease agreement and return ONLY a valid JSON object:

{
  "tenant_name": "full name of tenant",
  "property": "full property address",
  "rent": "monthly rent as number only",
  "deposit": "security deposit as number only",
  "start_date": "lease start date in YYYY-MM-DD",
  "end_date": "lease end date in YYYY-MM-DD",
  "late_fee_terms": "late fee terms as a short description",
  "beds": "number of bedrooms as integer",
  "baths": "number of bathrooms as decimal",
  "landlord_name": "landlord name if found"
}

If a field is not found use empty string. Return only the JSON object.`,
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250620',
        max_tokens: 512,
        messages: [{ role: 'user', content }],
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: 'AI processing failed. Try signing up for the full version.' }, { status: 500 });
    }

    const text = result.content?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    try {
      return NextResponse.json(JSON.parse(cleaned));
    } catch {
      return NextResponse.json({ error: 'Could not parse lease data.' }, { status: 500 });
    }
  } catch (err) {
    console.error('[demo-extract] Error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
