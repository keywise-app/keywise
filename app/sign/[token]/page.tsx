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
          <DocumentSigning
            token={token}
            tenantName={docData.tenant_name}
            documentName={docData.document_name}
            documentType={docData.document_type}
            fileUrl={docData.file_url}
            onSigned={() => setState('signed')}
          />
        )}
      </div>
    </div>
  );
}
