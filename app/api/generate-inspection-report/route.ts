import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { type, property, tenant_name, date, rooms, overall_condition, notes } = await req.json();

    const roomSummary = (rooms || []).map((r: any) =>
      `${r.name}: Condition: ${r.condition || 'Not rated'}${r.notes ? '. Notes: ' + r.notes : ''}${r.photoCount ? '. Photos: ' + r.photoCount : ''}`
    ).join('\n');

    const prompt = `Generate a professional property inspection report.

Type: ${type === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection
Property: ${property}
Tenant: ${tenant_name}
Date: ${date}
Overall Condition: ${overall_condition || 'Not specified'}
${notes ? 'General Notes: ' + notes : ''}

Rooms Inspected:
${roomSummary}

Format as a professional document with:
1. Header with inspection type, property, tenant, and date
2. Executive summary (2-3 sentences)
3. Room-by-room breakdown with condition and findings
4. Items requiring attention or repair (if any)
5. Overall condition assessment
6. ${type === 'move_out' ? 'Deposit deduction recommendations if applicable' : 'Baseline condition notes for future reference'}

Be specific, professional, and concise. Use clear headings.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }

    const report = data.content?.[0]?.text || '';
    return NextResponse.json({ report });
  } catch (err: any) {
    console.error('[generate-inspection-report] Error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to generate report' }, { status: 500 });
  }
}
