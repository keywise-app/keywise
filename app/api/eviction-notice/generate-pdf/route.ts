import { NextRequest } from 'next/server';
import { buildEvictionNoticePdf } from '../../../../lib/compliance/ca/eviction-notice-pdf';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { noticeText, noticeTypeLabel, tenantName, propertyAddress } = body;

    if (!noticeText) {
      return Response.json({ error: 'Missing noticeText' }, { status: 400 });
    }

    const pdfBuffer = await buildEvictionNoticePdf({
      noticeText,
      noticeTypeLabel: noticeTypeLabel || 'Eviction Notice',
      tenantName: tenantName || 'Tenant',
      propertyAddress: propertyAddress || '',
    });

    const safeName = `${noticeTypeLabel || 'eviction-notice'}-${tenantName || 'tenant'}`
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-');

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error('Generate PDF error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
