import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { base64, fileType } = await req.json();

    const isImage = fileType.startsWith('image/');
    const isPDF = fileType === 'application/pdf';

    if (!isImage && !isPDF) {
      return NextResponse.json({ error: 'Please upload a PDF or image file.' });
    }

    const content: any[] = [];

    if (isImage) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: fileType, data: base64 },
      });
    } else {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      });
    }

    content.push({
      type: 'text',
      text: `Extract expense information from this receipt or invoice and return ONLY a valid JSON object with no extra text, markdown, or explanation:

{"description":"brief description of what was purchased or service performed","amount":"total amount as number only no dollar sign","date":"date in YYYY-MM-DD format","category":"one of: Repairs, Maintenance, Insurance, Taxes, Utilities, Legal, Mortgage, Management, Other","vendor":"name of the vendor or company","deductible":true}

Rules:
- category should be your best guess based on what the receipt is for
- deductible should be true for most property-related expenses
- If a field is not found use an empty string
- Return only the JSON object`,
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content }],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Claude error:', result);
      return NextResponse.json({ error: 'Could not read the file. Please fill in manually.' });
    }

    const text = result.content?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Extract receipt error:', err);
    return NextResponse.json({ error: 'Could not extract receipt data. Please fill in manually.' });
  }
}