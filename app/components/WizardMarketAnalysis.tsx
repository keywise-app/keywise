'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, btn } from '../lib/theme';
import FmvRefineModal, { type FmvContext } from './FmvRefineModal';

export default function WizardMarketAnalysis({ onClose }: { onClose: () => void }) {
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [showFmv, setShowFmv] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('leases').select('*').eq('archived', false).order('tenant_name');
      if (data) setLeases(data);
      setLoading(false);
    })();
  }, []);

  const runFmv = async (ctx: FmvContext) => {
    setShowFmv(false);
    setAnalyzing(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      const res = await fetch('/api/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, property: selected.property, current_rent: selected.rent, ...ctx }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.error) setResult(data);
      }
    } catch {}
    setAnalyzing(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.55)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
      <div style={{ background: T.surface, borderRadius: isMobile ? '20px 20px 0 0' : 20, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,52,96,0.28)' }}>
        <div style={{ padding: '17px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>Run Market Analysis</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          {!selected ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 6 }}>Pick a property</div>
              <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>Select a lease to analyze its fair market rent.</div>
              {loading ? <div style={{ color: T.inkMuted, fontSize: 13 }}>Loading...</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leases.map(l => (
                    <button key={l.id} onClick={() => { setSelected(l); setShowFmv(true); }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>{l.tenant_name}</div>
                        <div style={{ fontSize: 12, color: T.inkMuted }}>{l.property?.split(',')[0]}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>${(l.rent || 0).toLocaleString()}/mo</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : analyzing ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ color: T.navy, fontWeight: 600, fontSize: 14 }}>✦ Analyzing market rent...</div>
              <div style={{ color: T.inkMuted, fontSize: 12, marginTop: 6 }}>{selected.property?.split(',')[0]}</div>
            </div>
          ) : result ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>{selected.property?.split(',')[0]}</div>
              <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>{selected.tenant_name} · ${(selected.rent || 0).toLocaleString()}/mo current</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase' }}>Current</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>${(selected.rent || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: T.tealLight, borderRadius: T.radiusSm, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: T.tealDark, textTransform: 'uppercase' }}>Fair Market</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.tealDark }}>${(result.estimated_market_rent || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase' }}>Difference</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: (result.rent_difference || 0) > 0 ? T.greenDark : T.coral }}>
                    {(result.rent_difference || 0) > 0 ? '+' : ''}${(result.rent_difference || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {result.data_confidence && (
                <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 8 }}>Confidence: <strong>{result.data_confidence}</strong></div>
              )}
              {result.recommendations && (
                <div style={{ fontSize: 13, color: T.inkMid, fontStyle: 'italic', marginBottom: 8 }}>💡 {result.recommendations}</div>
              )}
              {result.neighborhood_trends && (
                <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>{result.neighborhood_trends}</div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setResult(null); setSelected(null); }} style={{ ...btn.ghost, flex: 1 }}>Analyze Another</button>
                <button onClick={onClose} style={{ ...btn.primary, flex: 1 }}>Done</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showFmv && <FmvRefineModal onClose={() => { setShowFmv(false); if (!result) setSelected(null); }} onRun={runFmv} />}
    </div>
  );
}
