'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DocumentSigning from '../../components/DocumentSigning';

const T = {
  navy: '#0F3460',
  teal: '#00D4AA',
  tealLight: '#E0FAF5',
  bg: '#F0F4FF',
  border: '#E0E6F0',
  inkMuted: '#8892A4',
  greenLight: '#E8F8F0',
  greenDark: '#00875A',
  coral: '#FF6B6B',
  coralLight: '#FFEDED',
  radius: 12,
};

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'ready' | 'signed' | 'already_signed' | 'expired' | 'error'>('loading');
  const [docData, setDocData] = useState<{
    tenant_name: string;
    document_name: string;
    document_type: string;
    file_url: string;
    inspection?: any;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [signedAt, setSignedAt] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/sign-document?token=${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d })))
      .then(({ ok, status, data }) => {
        if (ok) {
          setDocData(data);
          setState('ready');
        } else if (status === 409) {
          setSignedAt(data.signed_at || '');
          setState('already_signed');
        } else if (status === 410) {
          setState('expired');
        } else {
          setErrorMsg(data.error || 'Something went wrong.');
          setState('error');
        }
      })
      .catch(() => { setErrorMsg('Network error.'); setState('error'); });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      {/* Topbar */}
      <div style={{ background: T.navy, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Keywise</div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: 60, color: T.inkMuted, fontSize: 14 }}>
            Loading document…
          </div>
        )}

        {state === 'already_signed' && (
          <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Already Signed</div>
            <div style={{ fontSize: 14, color: T.inkMuted }}>
              This document has already been signed{signedAt ? ` on ${signedAt.slice(0, 10)}` : ''}.
            </div>
          </div>
        )}

        {state === 'expired' && (
          <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Link Expired</div>
            <div style={{ fontSize: 14, color: T.inkMuted }}>
              This signing link has expired. Please contact your landlord to request a new link.
            </div>
          </div>
        )}

        {state === 'error' && (
          <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, marginBottom: 8 }}>Invalid Link</div>
            <div style={{ fontSize: 14, color: T.inkMuted }}>{errorMsg}</div>
          </div>
        )}

        {state === 'signed' && (
          <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: T.greenLight, marginBottom: 20 }}>
              <span style={{ fontSize: 32 }}>✓</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.navy, marginBottom: 8 }}>Document Signed!</div>
            <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6 }}>
              You'll receive a confirmation email shortly. Keep it for your records.
            </div>
          </div>
        )}

        {state === 'ready' && docData && (
          <>
            {/* Inspection report display */}
            {docData.inspection && (
              <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(15,52,96,0.08)' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, marginBottom: 4 }}>
                  {docData.inspection.type === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection Report
                </div>
                <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>
                  {docData.inspection.property} — {new Date(docData.inspection.created_at).toLocaleDateString()}
                </div>

                {docData.inspection.overall_condition && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: T.inkMuted }}>Overall Condition: </span>
                    <span style={{ fontWeight: 700, color: T.navy }}>{docData.inspection.overall_condition}</span>
                  </div>
                )}

                {(docData.inspection.rooms || []).map((room: any, i: number) => (
                  <div key={i} style={{ background: '#F0F4FF', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>{room.name}</div>
                      {room.condition && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: room.condition === 'Excellent' ? '#E8F8F0' : room.condition === 'Good' ? T.tealLight : room.condition === 'Fair' ? '#FFF8E0' : '#FFF0F0',
                          color: room.condition === 'Excellent' ? T.greenDark : room.condition === 'Good' ? T.teal : room.condition === 'Fair' ? '#9A6500' : T.coral,
                        }}>{room.condition}</span>
                      )}
                    </div>
                    {room.notes && <div style={{ fontSize: 13, color: '#4A5068', lineHeight: 1.6 }}>{room.notes}</div>}
                  </div>
                ))}

                {docData.inspection.notes && (
                  <div style={{ background: T.tealLight, borderRadius: 10, padding: 14, marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: 'uppercase', marginBottom: 4 }}>General Notes</div>
                    <div style={{ fontSize: 13, color: T.navy, lineHeight: 1.6 }}>{docData.inspection.notes}</div>
                  </div>
                )}

                {docData.inspection.report_text && (
                  <div style={{ background: '#F8FAFF', borderRadius: 10, padding: 14, marginTop: 12, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', marginBottom: 6 }}>AI Report</div>
                    <div style={{ fontSize: 13, color: T.navy, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{docData.inspection.report_text}</div>
                  </div>
                )}

                {docData.inspection.landlord_signature && (
                  <div style={{ marginTop: 16, padding: 14, background: T.greenLight, borderRadius: 10, border: `1px solid ${T.greenDark}33` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.greenDark, textTransform: 'uppercase' }}>Landlord Signature</div>
                    <div style={{ fontFamily: "'Georgia', serif", fontSize: 18, color: T.navy, fontStyle: 'italic', marginTop: 4 }}>{docData.inspection.landlord_signature}</div>
                    <div style={{ fontSize: 11, color: T.greenDark, marginTop: 2 }}>{docData.inspection.landlord_signed_at ? new Date(docData.inspection.landlord_signed_at).toLocaleDateString() : ''}</div>
                  </div>
                )}

                <div style={{ marginTop: 16, padding: 14, background: '#FFF8E0', borderRadius: 10, border: '1px solid #9A650033' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#9A6500' }}>Please review the inspection report above, then sign below to confirm.</div>
                </div>
              </div>
            )}

            <DocumentSigning
              token={token}
              tenantName={docData.tenant_name}
              documentName={docData.document_name}
              documentType={docData.document_type}
              fileUrl={docData.file_url}
              onSigned={() => setState('signed')}
            />
          </>
        )}
      </div>
    </div>
  );
}
