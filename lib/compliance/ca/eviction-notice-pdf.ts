// lib/compliance/ca/eviction-notice-pdf.ts
//
// Server-side PDF rendering for generated eviction notices.
// Kept separate from the notice text templates so the same buffer can be
// streamed straight to the client (generate-pdf route) or uploaded to
// Supabase Storage (save route).

import PDFDocument from 'pdfkit';
import { DISCLAIMER_TEXTS } from '../disclaimer-texts';

// The base-14 PDF fonts (Times-Roman) use WinAnsiEncoding and have no glyphs
// for checkbox/box-drawing characters used in the notice templates' proof of
// service and relocation sections — swap them for ASCII equivalents.
function sanitizeForPdf(text: string): string {
  return text
    .replace(/☐/g, '[ ]')
    .replace(/─+/g, (dashes) => '-'.repeat(dashes.length));
}

export interface EvictionNoticePdfParams {
  noticeText: string;
  noticeTypeLabel: string;
  tenantName: string;
  propertyAddress: string;
}

export function buildEvictionNoticePdf({
  noticeText,
  noticeTypeLabel,
  tenantName,
  propertyAddress,
}: EvictionNoticePdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: `${noticeTypeLabel} - ${tenantName}`,
        Subject: propertyAddress,
        Author: 'Keywise',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .font('Times-Roman')
      .fontSize(12)
      .lineGap(4)
      .text(sanitizeForPdf(noticeText), { align: 'left' });

    doc.moveDown(1.5);
    doc
      .font('Times-Roman')
      .fontSize(8)
      .fillColor('#666666')
      .text(DISCLAIMER_TEXTS.document_footer, { align: 'left' });

    doc.end();
  });
}
