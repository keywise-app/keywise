'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const SURFACE = '#FFFFFF';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

export default function PricingCards() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    fetch('/api/founding-member-count')
      .then(r => r.json())
      .then(d => setRemaining(d.remaining ?? 100))
      .catch(() => setRemaining(100));
  }, []);

  const showFounding = remaining === null || remaining > 0;

  return (
    <div>
      {/* Billing toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', border: `1.5px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <button onClick={() => setBilling('monthly')}
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', border: 'none', cursor: 'pointer', background: billing === 'monthly' ? N : '#fff', color: billing === 'monthly' ? '#fff' : INK_MID, transition: 'all 0.15s' }}>
            Monthly
          </button>
          <button onClick={() => setBilling('annual')}
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', border: 'none', borderLeft: `1px solid ${BORDER}`, cursor: 'pointer', background: billing === 'annual' ? N : '#fff', color: billing === 'annual' ? '#fff' : INK_MID, transition: 'all 0.15s' }}>
            Annual <span style={{ fontSize: 11, fontWeight: 700, color: billing === 'annual' ? TEAL : TEAL_DARK }}>save $198</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showFounding ? 'repeat(3, 1fr)' : '1fr 1fr', gap: 20, maxWidth: showFounding ? 1020 : 720, margin: '0 auto' }}>
        <style>{`@media (max-width: 768px) { .pricing-grid { grid-template-columns: 1fr !important; max-width: 420px !important; } }`}</style>

        {/* Free */}
        <div className="pricing-grid" style={{ background: SURFACE, borderRadius: 20, padding: '32px 28px', border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(15,52,96,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Free</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: N, letterSpacing: '-2px' }}>$0</span>
            <span style={{ fontSize: 14, color: INK_MUTED }}>/forever</span>
          </div>
          <div style={{ fontSize: 13, color: INK_MID, marginBottom: 28 }}>1 unit</div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 28 }}>
            {['AB 1482 rent cap calculator', 'Eviction notice wizard', 'Move-in/out inspections', '1 saved unit', 'Document storage', 'AI communications'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 14, color: INK_MID }}>
                <span style={{ color: TEAL_DARK, fontWeight: 700, fontSize: 16 }}>&#10003;</span> {f}
              </div>
            ))}
          </div>
          <Link href="/?signup=true" style={{ display: 'block', textAlign: 'center', background: 'transparent', color: N, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Start free →
          </Link>
        </div>

        {/* Pro */}
        <div style={{ background: N, borderRadius: 20, padding: '32px 28px', border: `2px solid ${TEAL}44`, boxShadow: `0 8px 32px rgba(15,52,96,0.2)`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `${TEAL}12` }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: `${TEAL}08` }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Pro</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: TEAL, color: N, padding: '3px 10px', borderRadius: 100 }}>RECOMMENDED</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: '#fff', letterSpacing: '-2px' }}>{billing === 'annual' ? '$32.50' : '$49'}</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>/mo</span>
            </div>
            {billing === 'annual' && (
              <div style={{ fontSize: 12, color: TEAL, fontWeight: 600, marginBottom: 4 }}>$390 billed annually</div>
            )}
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>Unlimited units · 14-day free trial</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, marginBottom: 28 }}>
              {['Everything in Free', 'Unlimited units', 'Online rent collection', 'Compliance alerts', 'AI lease extraction', 'Tenant portal & messaging', 'PDF generation', 'Priority support'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                  <span style={{ color: TEAL, fontWeight: 700, fontSize: 16 }}>&#10003;</span> {f}
                </div>
              ))}
            </div>
            <Link href="/?signup=true" style={{ display: 'block', textAlign: 'center', background: TEAL, color: N, border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Start 14-day free trial →
            </Link>
          </div>
        </div>

        {/* Founding Member */}
        {showFounding && (
          <div style={{ background: SURFACE, borderRadius: 20, padding: '32px 28px', border: `2px solid ${TEAL}`, boxShadow: `0 4px 24px ${TEAL}22`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: TEAL }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Founding Member</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: N, letterSpacing: '-2px' }}>$29</span>
              <span style={{ fontSize: 14, color: INK_MUTED }}>/mo for life</span>
            </div>
            <div style={{ fontSize: 13, color: INK_MID, marginBottom: 20 }}>Same features as Pro. Locked in forever.</div>

            {/* Live counter */}
            <div style={{ background: BG, borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: INK_MID }}>Spots remaining</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: N }}>{remaining !== null ? remaining : '...'} of 100</span>
              </div>
              <div style={{ width: '100%', height: 6, background: BORDER, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: remaining !== null ? `${100 - remaining}%` : '0%', height: '100%', background: TEAL, borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
            </div>

            <div style={{ fontSize: 13, color: INK_MID, lineHeight: 1.6, marginBottom: 20 }}>
              For the landlords building Keywise with us. Maintain a continuous subscription and your $29/mo rate is locked in permanently.
            </div>

            <Link href="/?signup=true&plan=founding" style={{ display: 'block', textAlign: 'center', background: N, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Claim founding rate →
            </Link>

            <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 12, lineHeight: 1.5 }}>
              Cancel = lose rate. Resubscribe at $49/mo.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
