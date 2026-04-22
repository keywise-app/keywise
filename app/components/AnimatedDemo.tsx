'use client';
import { useEffect, useState, useRef } from 'react';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK_MUTED = '#8892A4';

export default function AnimatedDemo() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setStep(s => (s + 1) % 4);
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused]);

  const goToStep = (s: number) => {
    setStep(s);
    setPaused(true);
    setTimeout(() => setPaused(false), 5000);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 32,
      boxShadow: '0 20px 60px rgba(15,52,96,0.12)',
      maxWidth: 800,
      margin: '0 auto',
      position: 'relative',
      overflow: 'hidden',
      minHeight: 420,
    }}>
      {/* Browser chrome */}
      <div style={{
        background: BG,
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28CA42' }} />
        <div style={{ marginLeft: 12, fontSize: 11, color: INK_MUTED, fontFamily: 'monospace' }}>
          keywise.app
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
        {[0, 1, 2, 3].map(i => (
          <button key={i} onClick={() => goToStep(i)} style={{
            width: i === step ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i === step ? TEAL : BORDER,
            transition: 'all 0.3s',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }} />
        ))}
      </div>

      {/* Steps */}
      <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}>
        {step === 0 && <StepUpload />}
        {step === 1 && <StepExtract />}
        {step === 2 && <StepDashboard />}
        {step === 3 && <StepPayment />}
      </div>

      <style>{`
        @keyframes kw-fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes kw-slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes kw-popIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes kw-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes kw-progress {
          from { width: 0%; }
          to { width: 85%; }
        }
      `}</style>
    </div>
  );
}

function StepUpload() {
  return (
    <div style={{ animation: 'kw-fadeIn 0.5s' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: TEAL, fontWeight: 700, marginBottom: 4 }}>STEP 1</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: N }}>Upload Your Lease PDF</div>
      </div>
      <div style={{
        border: `2px dashed ${TEAL}`,
        borderRadius: 12,
        padding: 48,
        textAlign: 'center',
        background: '#F0FAFF',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12, lineHeight: 1 }}>📄</div>
        <div style={{ fontWeight: 700, color: N, marginBottom: 4 }}>lease-2026.pdf</div>
        <div style={{ fontSize: 13, color: INK_MUTED }}>Uploading...</div>
        <div style={{
          width: '60%',
          height: 6,
          background: BORDER,
          borderRadius: 3,
          margin: '12px auto 0',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '85%',
            height: '100%',
            background: TEAL,
            borderRadius: 3,
            animation: 'kw-progress 2s ease-out',
          }} />
        </div>
      </div>
    </div>
  );
}

function StepExtract() {
  const items = [
    { label: 'Tenant Name', value: 'Sarah Johnson', delay: '0s' },
    { label: 'Monthly Rent', value: '$2,400', delay: '0.4s' },
    { label: 'Payment Due', value: '1st of month', delay: '0.8s' },
    { label: 'Late Fee', value: '5% after 5 days', delay: '1.2s' },
    { label: 'Lease Term', value: '12 months', delay: '1.6s' },
  ];

  return (
    <div style={{ animation: 'kw-fadeIn 0.5s' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: TEAL, fontWeight: 700, marginBottom: 4 }}>STEP 2</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: N }}>AI Reads Your Lease</div>
      </div>
      <div style={{ background: N, borderRadius: 12, padding: 24, color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: TEAL,
            animation: 'kw-pulse 1s infinite',
          }} />
          <div style={{ color: TEAL, fontWeight: 700, fontSize: 13 }}>AI ANALYZING...</div>
        </div>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            animation: `kw-slideIn 0.5s ${item.delay} both`,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{item.label}</div>
            <div style={{ color: TEAL, fontWeight: 700, fontSize: 13 }}>✓ {item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDashboard() {
  const cards = [
    { label: 'Tenant', value: 'Sarah Johnson', icon: '👤' },
    { label: 'Property', value: 'Unit A', icon: '🏠' },
    { label: 'Rent', value: '$2,400/mo', icon: '💰' },
    { label: 'Status', value: 'Active', icon: '✅' },
  ];

  return (
    <div style={{ animation: 'kw-fadeIn 0.5s' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: TEAL, fontWeight: 700, marginBottom: 4 }}>STEP 3</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: N }}>Tenant Setup Complete</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {cards.map((item, i) => (
          <div key={i} style={{
            background: BG,
            borderRadius: 10,
            padding: 16,
            animation: `kw-popIn 0.3s ${i * 0.1}s both`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 4, lineHeight: 1 }}>{item.icon}</div>
            <div style={{ fontSize: 11, color: INK_MUTED, marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontWeight: 700, color: N, fontSize: 14 }}>{item.value}</div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 16,
        background: '#E8F8F0',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ fontSize: 24, lineHeight: 1 }}>🎉</div>
        <div>
          <div style={{ fontWeight: 700, color: '#0F7040', fontSize: 14 }}>Setup complete in 12 seconds</div>
          <div style={{ fontSize: 12, color: '#0F7040' }}>Payment schedule auto-generated</div>
        </div>
      </div>
    </div>
  );
}

function StepPayment() {
  return (
    <div style={{ animation: 'kw-fadeIn 0.5s' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: TEAL, fontWeight: 700, marginBottom: 4 }}>STEP 4</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: N }}>Tenant Pays Online</div>
      </div>
      <div style={{
        background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
        borderRadius: 12,
        padding: 32,
        color: 'white',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8, lineHeight: 1 }}>💸</div>
        <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.9, marginBottom: 4 }}>PAYMENT RECEIVED</div>
        <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>$2,400</div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>From Sarah Johnson · Unit A</div>
        <div style={{
          marginTop: 16,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 6,
          padding: '8px 16px',
          display: 'inline-block',
          fontSize: 12,
          fontWeight: 600,
        }}>
          ✓ Direct to your bank via Stripe
        </div>
      </div>
    </div>
  );
}
