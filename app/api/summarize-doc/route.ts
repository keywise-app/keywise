import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { base64, fileType, mode } = await req.json();

    const isImage = fileType.startsWith('image/');
    const content: any[] = [];

    if (isImage) {
      content.push({ type: 'image', source: { type: 'base64', media_type: fileType, data: base64 } });
    } else {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } });
    }

    const prompts: Record<string, string> = {
      summarize: 'Summarize this document for a landlord. Include: document type, key parties, important dates, coverage amounts or key terms, and any action items or expiry dates to be aware of. Be concise and practical.',
      insurance: 'Check this renters insurance policy for a landlord. Provide: 1) Is it valid/current? 2) Policy holder name 3) Coverage amounts (liability, personal property) 4) Expiry date 5) Is the landlord listed as additional interested party? 6) Any gaps or concerns. Be direct and practical.',
      improvement: 'Summarize this capital improvement document for a landlord. Include: what improvement was made, contractor, cost, date completed, and whether this appears to be a capital improvement (depreciable) vs a repair (expensable). Flag any tax implications.',
repair_receipt: 'Summarize this repair receipt for a landlord. Include: what was repaired, vendor, total cost, date, and whether this appears to be a routine repair (expensable) or a capital improvement (depreciable). Note any warranty information.',
    };

    content.push({ type: 'text', text: prompts[mode] || prompts.summarize });

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
      return NextResponse.json({ error: 'Could not process document.' });
    }
    const text = result.content?.[0]?.text || '';
    return NextResponse.json({ result: text });
  } catch (err) {
    console.error('Summarize doc error:', err);
    return NextResponse.json({ error: 'Could not process document.' });
  }
}