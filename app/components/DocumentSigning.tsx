'use client';
import { useState, useRef, useEffect } from 'react';

const T = {
  navy: '#0F3460',
  teal: '#00D4AA',
  tealLight: '#E0FAF5',
  tealDark: '#00A886',
  bg: '#F0F4FF',
  surface: '#fff',
  border: '#E0E6F0',
  ink: '#1A1A2E',
  inkMid: '#4A5568',
  inkMuted: '#8892A4',
  coral: '#FF6B6B',
  coralLight: '#FFEDED',
  amber: '#FFB347',
  amberLight: '#FFF3E0',
  greenLight: '#E8F8F0',
  greenDark: '#00875A',
  radius: 12,
  radiusSm: 8,
  shadow: '0 1px 4px rgba(15,52,96,0.08)',
};

type Props = {
  token: string;
  tenantName: string;
  documentName: string;
  documentType: string;
  fileUrl?: string;
  onSigned: () => void;
};

export default function DocumentSigning({ token, tenantName, documentName, documentType, fileUrl, onSigned }: Props) {
  const [tab, setTab] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(tenantName);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(!fileUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#F8F9FF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = T.navy;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [tab]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasDrawn(true);
    }
    lastPos.current = pos;
  };

  const endDraw = () => {
    setDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#F8F9FF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const getSignatureData = (): string => {
    if (tab === 'type') {
      return 'typed:' + typedName;
    }
    const canvas = canvasRef.current;
    return canvas ? canvas.toDataURL('image/png') : '';
  };

  const canSign = agreed && (tab === 'draw' ? hasDrawn : typedName.trim().length > 0);

  const handleSign = async () => {
    if (!canSign) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/sign-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signature_data: getSignatureData(),
          signature_type: tab,
          signer_name: typedName || tenantName,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert('Error: ' + data.error);
        setSubmitting(false);
      } else {
        onSigned();
      }
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Could not submit signature.'));
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 0 40px' }}>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />

      {/* Document header */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 20, marginBottom: 16, boxShadow: T.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📄</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>{documentName}</div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginTop: 2 }}>Requires your signature</div>
          </div>
        </div>

        {fileUrl && (
          <div style={{ marginTop: 16 }}>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.navy, fontWeight: 600, background: T.bg, padding: '8px 14px', borderRadius: T.radiusSm, textDecoration: 'none', border: `1px solid ${T.border}` }}>
              📄 View Full Document
            </a>
          </div>
        )}
      </div>

      {/* Signature area */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 24, marginBottom: 16, boxShadow: T.shadow }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 16 }}>Your Signature</div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: T.bg, borderRadius: T.radiusSm, padding: 4, marginBottom: 20, width: 'fit-content' }}>
          {(['draw', 'type'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 18px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === t ? T.navy : 'transparent',
              color: tab === t ? '#fff' : T.inkMuted,
              transition: 'all 0.15s',
            }}>
              {t === 'draw' ? '✏️ Draw' : 'Aa Type'}
            </button>
          ))}
        </div>

        {tab === 'draw' && (
          <div>
            <canvas
              ref={canvasRef}
              width={520}
              height={160}
              style={{ width: '100%', height: 160, border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, cursor: 'crosshair', touchAction: 'none', display: 'block', background: '#F8F9FF' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: T.inkMuted }}>Draw your signature above</span>
              <button onClick={clearCanvas} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>
            </div>
          </div>
        )}

        {tab === 'type' && (
          <div>
            <input
              type="text"
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              placeholder="Type your full name"
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
                padding: '14px 16px', fontSize: 28, outline: 'none',
                fontFamily: '"Dancing Script", cursive',
                color: T.navy, background: '#F8F9FF',
              }}
            />
            <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 8 }}>Type your full name as it appears on your lease</div>
          </div>
        )}
      </div>

      {/* Legal agreement */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 20, marginBottom: 20, boxShadow: T.shadow }}>
        <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ marginTop: 2, width: 18, height: 18, flexShrink: 0, cursor: 'pointer', accentColor: T.navy }}
          />
          <span style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.6 }}>
            I, <strong>{typedName || tenantName}</strong>, agree that my electronic signature is legally binding and has the same effect as a handwritten signature. I have read and agree to the terms of <strong>{documentName}</strong>.
          </span>
        </label>
      </div>

      {/* Sign button */}
      <button
        onClick={handleSign}
        disabled={!canSign || submitting}
        style={{
          width: '100%', background: canSign ? T.navy : T.inkMuted, color: '#fff',
          border: 'none', borderRadius: T.radius, padding: '16px 24px',
          fontSize: 16, fontWeight: 700, cursor: canSign ? 'pointer' : 'default',
          transition: 'background 0.2s',
        }}>
        {submitting ? 'Signing…' : '✍️ Sign Document'}
      </button>

      {!canSign && (
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: T.inkMuted }}>
          {tab === 'draw' && !hasDrawn ? 'Draw your signature, then' : 'Enter your name, then'} check the agreement box above to sign.
        </div>
      )}
    </div>
  );
}
