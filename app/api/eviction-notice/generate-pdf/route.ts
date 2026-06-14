import { NextRequest } from 'next/server';

/**
 * Returns the notice as print-friendly HTML.
 *
 * For v1, the client opens this HTML in a new window and calls window.print(),
 * which triggers the browser's native Print / Save as PDF dialog.
 * No server-side PDF library is needed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { noticeText, noticeTypeLabel, tenantName } = body;

    if (!noticeText) {
      return Response.json({ error: 'Missing noticeText' }, { status: 400 });
    }

    const escaped = noticeText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${noticeTypeLabel || 'Eviction Notice'} - ${tenantName || 'Tenant'}</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      margin: 1in;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
<pre>${escaped}</pre>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    console.error('Generate PDF error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
