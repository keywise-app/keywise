'use client';

import { useRef } from 'react';
import LegalDisclaimer from '../../../components/compliance/LegalDisclaimer';

const N = '#0F3460';
const TEAL_DARK = '#00A886';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';
const CORAL = '#FF6B6B';

interface NoticePreviewProps {
  noticeText: string;
  tenantName: string;
  propertyAddress: string;
  noticeTypeLabel: string;
  expirationDate: string;
  earliestUDFiling: string;
  noticeDays: number;
  excludeWeekendsHolidays: boolean;
  serviceMethod: string;
  requiresRelocation: boolean;
  relocationAmount?: number;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

export default function NoticePreview({
  noticeText,
  tenantName,
  propertyAddress,
  noticeTypeLabel,
  expirationDate,
  earliestUDFiling,
  noticeDays,
  excludeWeekendsHolidays,
  serviceMethod,
  requiresRelocation,
  relocationAmount,
  onSave,
  saving,
  saved,
}: NoticePreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${noticeTypeLabel} - ${tenantName}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 1in; color: #000; }
          pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'Times New Roman', serif; font-size: 12pt; }
          @media print { body { margin: 0.75in; } }
        </style>
      </head>
      <body><pre>${noticeText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`${noticeTypeLabel} - ${propertyAddress}`);
    const body = encodeURIComponent(noticeText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div>
      {/* Disclaimer banner */}
      <div style={{ background: '#FFF0F0', border: `1px solid ${CORAL}33`, borderRadius: 10, padding: 12, marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: CORAL, margin: 0, fontWeight: 600 }}>
          Review this notice carefully before serving. This tool does NOT provide legal advice. Consult an attorney if you have questions.
        </p>
      </div>

      {/* Key dates summary */}
      <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 10 }}>Key Dates & Deadlines</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Notice Expires</div>
            <div style={{ fontSize: 14, color: INK, fontWeight: 600 }}>{expirationDate}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Earliest UD Filing</div>
            <div style={{ fontSize: 14, color: INK, fontWeight: 600 }}>{earliestUDFiling}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Notice Period</div>
            <div style={{ fontSize: 14, color: INK, fontWeight: 600 }}>
              {noticeDays} days {excludeWeekendsHolidays ? '(excl. weekends/holidays)' : '(calendar days)'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Service Method</div>
            <div style={{ fontSize: 14, color: INK, fontWeight: 600 }}>{serviceMethod || 'Not selected'}</div>
          </div>
        </div>
        {requiresRelocation && relocationAmount && (
          <div style={{ marginTop: 10, padding: '8px 0', borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Relocation Assistance</div>
            <div style={{ fontSize: 14, color: INK, fontWeight: 600 }}>${relocationAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (due within 15 days of service)</div>
          </div>
        )}
      </div>

      {/* Notice document */}
      <div
        ref={printRef}
        style={{
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: 32,
          boxShadow: '0 2px 8px rgba(15,52,96,0.06)',
          marginBottom: 20,
          maxHeight: 500,
          overflowY: 'auto',
        }}
      >
        <pre style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          fontFamily: "'Times New Roman', serif",
          fontSize: 13,
          lineHeight: 1.6,
          color: INK,
          margin: 0,
        }}>
          {noticeText}
        </pre>
        <LegalDisclaimer variant="document_footer" />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <button
          onClick={handlePrint}
          style={{
            background: N,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '11px 22px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Print / Download PDF
        </button>
        <button
          onClick={onSave}
          disabled={saving || saved}
          style={{
            background: saved ? '#E8F8F0' : '#E0FAF5',
            color: saved ? '#0F7040' : TEAL_DARK,
            border: `1px solid ${saved ? '#2ECC7133' : '#00D4AA33'}`,
            borderRadius: 10,
            padding: '11px 22px',
            fontSize: 14,
            fontWeight: 600,
            cursor: saving || saved ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saved ? 'Saved' : saving ? 'Saving...' : 'Save to Unit'}
        </button>
        <button
          onClick={handleEmail}
          style={{
            background: 'transparent',
            color: INK_MID,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: '11px 22px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Email to Self
        </button>
      </div>

      {/* Service instructions */}
      <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 8 }}>Service Instructions (CCP 1162)</div>
        <div style={{ fontSize: 13, color: INK_MID, lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 8px' }}>
            <strong>Personal service:</strong> Deliver a copy directly to the tenant. No additional steps required.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            <strong>Substituted service:</strong> If the tenant is absent, leave a copy with a person of suitable age and discretion at the residence or workplace, AND mail a copy to the tenant.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            <strong>Posting + mailing:</strong> If the residence and workplace cannot be located, post a copy in a conspicuous place on the property AND mail a copy to the property address.
          </p>
          <p style={{ margin: '0 0 4px', fontSize: 12, color: INK_MUTED }}>
            Note: When service includes mailing within California, add 5 calendar days to the notice period (CCP 1013(a)).
          </p>
          <p style={{ margin: 0, fontSize: 12, color: CORAL, fontWeight: 600 }}>
            CCP 1161(6): A landlord shall not charge a tenant a fee for serving any notice.
          </p>
        </div>
      </div>
    </div>
  );
}
