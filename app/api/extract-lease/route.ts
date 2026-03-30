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
      content.push({ type: 'image', source: { type: 'base64', media_type: fileType, data: base64 } });
    } else {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } });
    }

    content.push({
      type: 'text',
      text: `Extract all available information from this lease agreement and return ONLY a valid JSON object with no extra text, markdown, or explanation:

{
  "tenant_name": "full name of tenant",
  "email": "tenant email if found, empty string if not",
  "phone": "tenant phone if found, empty string if not",
  "property": "full property address",
  "rent": "monthly rent as number only, no dollar sign",
  "deposit": "security deposit as number only, no dollar sign",
  "start_date": "lease start date in YYYY-MM-DD format",
  "end_date": "lease end date in YYYY-MM-DD format",
  "property_type": "one of: apartment, condo, house, townhouse, duplex, studio",
  "beds": "number of bedrooms as integer",
  "baths": "number of bathrooms as decimal",
  "sqft": "square footage as integer if found, empty string if not",
  "pets": "pet policy if mentioned, empty string if not",
  "parking": "parking details if mentioned, empty string if not",
  "laundry": "laundry details if mentioned, empty string if not",
  "utilities_included": "utilities included if mentioned, empty string if not",
  "payment_day": "day of month rent is due as integer, e.g. 1 for 1st, default 1 if not specified",
  "payment_frequency": "monthly, bi-weekly, or weekly - default monthly if not specified",
  "late_fee_percent": "late fee as percentage number only if specified as percent, empty string if not",
  "late_fee_fixed": "late fee as fixed dollar amount number only if specified as flat fee, empty string if not",
  "late_fee_type": "percent or fixed - which type of late fee applies",
  "late_fee_days": "number of grace period days before late fee applies, as integer",
  "late_fee_clause": "exact verbatim quote of the late fee clause from the lease, empty string if not found",
  "landlord_name": "landlord or property manager name if found, empty string if not"
}

If a field is not found use an empty string. Return only the JSON object.`,
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
    console.error('Extract error:', err);
    return NextResponse.json({ error: 'Could not extract lease data. Please fill in manually.' });
  }
}