'use client';
import { useState, useRef } from 'react';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

export default function DemoLeaseExtractor({ onSignupClick }: { onSignupClick: () => void }) {
  const [extracted, setExtracted] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExtract = async (file: File) => {
    setLoading(true);
    setError('');
    setExtracted(null);
    const start = Date.now();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/demo-extract-lease', { method: 'POST', body: formData });
      const data = await res.json();
      setElapsed(Math.round((Date.now() - start) / 1000));
      if (data.error) { setError(data.error); }
      else { setExtracted(data); }
    } catch {
      setError('Extraction failed. Try signing up for the full version.');
    }
    setLoading(false);
  };

  const fields = [
    { label: 'Tenant Name', key: 'tenant_name' },
    { label: 'Property', key: 'property' },
    { label: 'Monthly Rent', key: 'rent', fmt: (v: string) => v ? '$' + Number(v).toLocaleString() : null },
    { label: 'Security Deposit', key: 'deposit', fmt: (v: string) => v ? '$' + Number(v).toLocaleString() : null },
    { label: 'Lease Start', key: 'start_date' },
    { label: 'Lease End', key: 'end_date' },
    { label: 'Late Fee', key: 'late_fee_terms' },
    { label: 'Bedrooms', key: 'beds' },
    { label: 'Bathrooms', key: 'baths' },
    { label: 'Landlord', key: 'landlord_name' },
  ];

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 32,
      maxWidth: 700,
      margin: '0 auto',
      boxShadow: '0 20px 60px rgba(15,52,96,0.1)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ color: TEAL_DARK, fontWeight: 700, fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Try It Now — No Signup Required
        </div>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: N, margin: 0 }}>
          Drop a Lease PDF — Watch AI Extract Everything
        </h3>
      </div>

      {!extracted && !loading && (
        <label style={{
          display: 'block',
          border: `2px dashed ${TEAL}`,
          borderRadius: 12,
          padding: 50,
          textAlign: 'center',
          cursor: 'pointer',
          background: '#F0FAFF',
        }}>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            onChange={e => e.target.files?.[0] && handleExtract(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: 48, marginBottom: 12, lineHeight: 1 }}>📄</div>
          <div style={{ fontWeight: 700, color: N, marginBottom: 4, fontSize: 16 }}>
            Click to upload your lease
          </div>
          <div style={{ fontSize: 13, color: INK_MUTED }}>
            PDF or image · Max 10MB · Not stored on our servers
          </div>
        </label>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${BORDER}`, borderTopColor: TEAL, margin: '0 auto 16px', animation: 'kw-spin 0.8s linear infinite' }} />
          <div style={{ color: N, fontWeight: 700, fontSize: 15 }}>AI is reading your lease...</div>
          <div style={{ color: INK_MUTED, fontSize: 13, marginTop: 4 }}>This usually takes 5-10 seconds</div>
          <style>{`@keyframes kw-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ background: '#FFF0F0', borderRadius: 10, padding: '14px 20px', marginBottom: 16, color: '#CC0000', fontSize: 13, fontWeight: 600 }}>{error}</div>
          <button onClick={() => { setError(''); fileRef.current?.click(); }}
            style={{ background: N, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Try Another File
          </button>
        </div>
      )}

      {extracted && (
        <div>
          <div style={{ background: N, borderRadius: 12, padding: 24, color: 'white', marginBottom: 20 }}>
            <div style={{ color: TEAL, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>✓ EXTRACTED IN {elapsed} SECONDS</div>
            {fields.map((f, i) => {
              const raw = extracted[f.key];
              if (!raw && raw !== 0) return null;
              const value = f.fmt ? f.fmt(String(raw)) : String(raw);
              if (!value) return null;
              return (
                <div key={f.key} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < fields.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{f.label}</div>
                  <div style={{ color: TEAL, fontWeight: 700, fontSize: 13 }}>{value}</div>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#E8F8F0', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#0F7040', marginBottom: 4, fontSize: 15 }}>
              That took {elapsed} seconds
            </div>
            <div style={{ fontSize: 13, color: '#0F7040' }}>
              Sign up free to save this data and manage your properties
            </div>
          </div>

          <button onClick={onSignupClick}
            style={{ width: '100%', background: TEAL, color: N, border: 'none', padding: '16px', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Save This & Continue Free →
          </button>
          <div style={{ fontSize: 12, color: INK_MUTED, marginTop: 8, textAlign: 'center' }}>
            No credit card · Free for 1-2 units
          </div>
        </div>
      )}
    </div>
  );
}
