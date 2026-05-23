'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { callClaude } from '../lib/claude';
import { T, btn, input, label, card } from '../lib/theme';
import FmvRefineModal, { type FmvContext } from './FmvRefineModal';

type Step = 'pick' | 'fmv' | 'terms' | 'preview';

export default function WizardRenewal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('pick');
  const [leases, setLeases] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFmv, setShowFmv] = useState(false);
  const [market, setMarket] = useState<any>(null);
  const [fmvLoading, setFmvLoading] = useState(false);
  const [proposedRent, setProposedRent] = useState('');
  const [term, setTerm] = useState('12');
  const [responseDate, setResponseDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [draft, setDraft] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    (async () => {
      const [lRes, pRes] = await Promise.all([
        supabase.from('leases').select('*').eq('archived', false).order('tenant_name'),
        supabase.from('profiles').select('full_name, email, phone, company').limit(1).maybeSingle(),
      ]);
      if (lRes.data) setLeases(lRes.data);
      if (pRes.data) setProfile(pRes.data);
      setLoading(false);
    })();
  }, []);

  const runFmv = async (ctx: FmvContext) => {
    setShowFmv(false);
    setFmvLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    try {
      const res = await fetch('/api/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, property: selected.property, current_rent: selected.rent, ...ctx }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          setMarket(data);
          setProposedRent(String(data.recommended_rent || data.estimated_market_rent || selected.rent));
        }
      }
    } catch {}
    setFmvLoading(false);
    setStep('terms');
  };

  const generateDraft = async () => {
    if (!selected) return;
    setDrafting(true);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const sig = profile?.full_name ? '\n\nSign off as: ' + profile.full_name + (profile?.company ? ', ' + profile.company : '') : '';
    const prompt = `Draft a professional lease renewal offer. Date: ${today}. Tenant: ${selected.tenant_name}, Property: ${selected.property}, Current rent: $${selected.rent}/mo. Proposed new rent: $${proposedRent}/mo. Renewal term: ${term === 'month-to-month' ? 'month-to-month' : term + ' months'}. Response deadline: ${responseDate}.${market ? ' Market context: FMV is $' + market.estimated_market_rent + '/mo.' : ''} Be warm, explain reasoning briefly.${sig}`;
    const result = await callClaude(prompt);
    setDraft(result);
    setDrafting(false);
    setStep('preview');
  };

  const STEPS = ['Pick Unit', 'Market Analysis', 'Set Terms', 'Preview & Send'];
  const stepIdx = step === 'pick' ? 0 : step === 'fmv' ? 1 : step === 'terms' ? 2 : 3;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.55)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}>
      <div style={{ background: T.surface, borderRadius: isMobile ? '20px 20px 0 0' : 20, width: '100%', maxWidth: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,52,96,0.28)' }}>

        {/* Header */}
        <div style={{ padding: '17px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stepIdx > 0 && <button onClick={() => setStep(stepIdx === 3 ? 'terms' : stepIdx === 2 ? 'fmv' : 'pick')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, fontSize: 18, padding: '0 6px 0 0', lineHeight: 1 }}>←</button>}
            <span style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>Send Renewal / Increase</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < stepIdx ? T.teal : i === stepIdx ? T.navy : T.border }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600 }}>Step {stepIdx + 1} of 4 — {STEPS[stepIdx]}</div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>

          {step === 'pick' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 6 }}>Which tenant?</div>
              <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>Select the lease you want to renew or increase rent on.</div>
              {loading ? <div style={{ color: T.inkMuted, fontSize: 13 }}>Loading leases...</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leases.map(l => (
                    <button key={l.id} onClick={() => { setSelected(l); setStep('fmv'); setShowFmv(true); }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>{l.tenant_name}</div>
                        <div style={{ fontSize: 12, color: T.inkMuted }}>{l.property?.split(',')[0]}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>${(l.rent || 0).toLocaleString()}/mo</div>
                        {l.end_date && <div style={{ fontSize: 11, color: T.inkMuted }}>Ends {l.end_date}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'fmv' && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              {fmvLoading ? (
                <div style={{ color: T.navy, fontWeight: 600 }}>✦ Running market analysis...</div>
              ) : market ? (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 12 }}>Market Analysis Complete</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                    <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase' }}>Current</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>${(selected?.rent || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ background: T.tealLight, borderRadius: T.radiusSm, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: T.tealDark, textTransform: 'uppercase' }}>Fair Market</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: T.tealDark }}>${(market.estimated_market_rent || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase' }}>Recommended</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>${(market.recommended_rent || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  {market.recommendations && <div style={{ fontSize: 13, color: T.inkMid, fontStyle: 'italic', marginBottom: 16 }}>💡 {market.recommendations}</div>}
                  <button onClick={() => setStep('terms')} style={{ ...btn.primary }}>Continue to Terms →</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: T.inkMuted }}>Opening market analysis...</div>
                </div>
              )}
            </div>
          )}

          {step === 'terms' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 6 }}>Set Renewal Terms</div>
              <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>for {selected?.tenant_name} at {selected?.property?.split(',')[0]}</div>

              <div style={{ marginBottom: 14 }}>
                <label style={label}>New Monthly Rent ($)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" value={proposedRent} placeholder={String(selected?.rent || '')}
                    onChange={e => setProposedRent(e.target.value)}
                    style={{ ...input, flex: 1, fontSize: 16, fontWeight: 700 }} />
                  {market && (
                    <button onClick={() => setProposedRent(String(market.estimated_market_rent))}
                      style={{ ...btn.primary, fontSize: 11, padding: '6px 10px', whiteSpace: 'nowrap' as const }}>Use FMV</button>
                  )}
                </div>
                {proposedRent && selected && +proposedRent !== selected.rent && (
                  <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: +proposedRent > selected.rent ? T.greenDark : T.coral }}>
                    {+proposedRent > selected.rent ? '+' : ''}${(+proposedRent - selected.rent).toLocaleString()}/mo ({(((+proposedRent - selected.rent) / selected.rent) * 100).toFixed(1)}%)
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label}>Renewal Term</label>
                <select value={term} onChange={e => setTerm(e.target.value)} style={input}>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="18">18 months</option>
                  <option value="24">24 months</option>
                  <option value="month-to-month">Month-to-month</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={label}>Response Needed By</label>
                <input type="date" value={responseDate} onChange={e => setResponseDate(e.target.value)} style={input} />
              </div>

              <button onClick={generateDraft} disabled={drafting || !proposedRent} style={{ ...btn.primary, width: '100%', opacity: !proposedRent ? 0.5 : 1 }}>
                {drafting ? '✦ Drafting notice...' : '✦ Generate Renewal Notice'}
              </button>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 6 }}>Preview & Send</div>

              {/* Delta summary */}
              <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 14, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: T.inkMuted, textTransform: 'uppercase' }}>Rent Change</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>${selected?.rent} → ${proposedRent}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: +proposedRent > (selected?.rent || 0) ? T.greenDark : T.coral }}>
                    {+proposedRent > (selected?.rent || 0) ? '+' : ''}${(+proposedRent - (selected?.rent || 0)).toLocaleString()}/mo
                  </div>
                  {market && <div style={{ fontSize: 11, color: T.inkMuted }}>FMV: ${market.estimated_market_rent}</div>}
                </div>
              </div>

              {/* Draft text */}
              <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 16, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 250, overflowY: 'auto', color: T.ink, border: `1px solid ${T.border}`, marginBottom: 14 }}>
                {draft}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => {
                  if (selected?.email) window.open('mailto:' + selected.email + '?subject=' + encodeURIComponent('Lease Renewal — ' + selected.property) + '&body=' + encodeURIComponent(draft));
                }} style={{ ...btn.teal, flex: 1, fontSize: 13 }}>
                  ✉️ Send Email
                </button>
                <button onClick={() => { navigator.clipboard.writeText(draft); }} style={{ ...btn.ghost, fontSize: 13 }}>
                  📋 Copy
                </button>
                <button onClick={() => setStep('terms')} style={{ ...btn.ghost, fontSize: 13 }}>
                  ✏️ Edit Terms
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FMV Refine Modal */}
      {showFmv && <FmvRefineModal onClose={() => { setShowFmv(false); setStep('terms'); }} onRun={runFmv} />}
    </div>
  );
}
