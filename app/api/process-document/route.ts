import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { base64, fileType, fileName, fileUrl } = await req.json();

    let finalBase64 = base64;
    let finalFileType = fileType;

    if (fileUrl) {
      const response = await fetch(fileUrl);
      const buffer = await response.arrayBuffer();
      finalBase64 = Buffer.from(buffer).toString('base64');
      finalFileType = response.headers.get('content-type') || fileType || 'application/pdf';
    }

    const isImage = finalFileType.startsWith('image/');
    const content: any[] = [];

    if (isImage) {
      content.push({ type: 'image', source: { type: 'base64', media_type: finalFileType, data: finalBase64 } });
    } else {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: finalBase64 } });
    }

    content.push({
      type: 'text',
      text: `Only read the first 3 pages of this document. You are a property management document processor. Analyze this document and return ONLY valid JSON with no markdown or explanation.

Identify the document type and extract all relevant data.

Return this exact structure:
{
  "document_type": "one of: lease, addendum, insurance_renters, insurance_property, inspection, move_in, move_out, repair_receipt, improvement, tax, mortgage, other",
  "confidence": "high/medium/low",
  "summary": "2-3 sentence summary of the document",
  "tenant_name": "full name if found, empty string if not",
  "property_address": "full address including unit if found, empty string if not",
  "building_address": "ONLY the street address with NO unit/apt/suite number. Example: if full address is '30492 Alcazar Drive Unit A, Dana Point CA', building_address should be '30492 Alcazar Drive, Dana Point, CA 92629'",
  "unit_number": "ONLY the unit identifier — A, B, 1, 2, Upper, Lower, etc. Empty string if single family with no units",
  "landlord_name": "landlord name if found, empty string if not",
  "monthly_rent": "number only, no dollar sign, empty string if not found",
  "deposit": "number only, no dollar sign, empty string if not found",
  "lease_start": "YYYY-MM-DD format if found, empty string if not",
  "lease_end": "YYYY-MM-DD format if found, empty string if not",
  "expiry_date": "YYYY-MM-DD format for insurance/docs that expire, empty string if not",
  "coverage_amount": "number only for insurance, empty string if not",
  "amount": "total dollar amount for receipts/expenses, number only, empty string if not",
  "vendor": "vendor or company name for receipts, empty string if not",
  "expense_category": "one of: Repairs, Maintenance, Insurance, Taxes, Utilities, Legal, Mortgage, Management, Other",
  "beds": "number if found, empty string if not",
  "baths": "number if found, empty string if not",
  "sqft": "number if found, empty string if not",
  "property_type": "apartment/condo/house/townhouse/duplex/studio if determinable, empty string if not",
  "document_date": "YYYY-MM-DD if found, empty string if not"
}

File name hint: ${fileName}

Return only the JSON object.`
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
        max_tokens: 400,
        messages: [{ role: 'user', content }],
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: 'Could not process document.' });
    }

    const text = result.content?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Process doc error:', err);
    return NextResponse.json({ error: 'Could not process document.' });
  }
}