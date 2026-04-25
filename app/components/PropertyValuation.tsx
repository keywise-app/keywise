'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, card, btn, label as labelStyle } from '../lib/theme';

type Valuation = {
  estimated_value_low: number;
  estimated_value_high: number;
  estimated_monthly_rent: number;
  rent_assessment: string;
  rent_difference_pct: number;
  cap_rate: number;
  gross_rent_multiplier: number;
  cash_on_cash_note: string;
  condition_score: number;
  condition_factors: string[];
  value_drivers: string[];
  value_risks: string[];
  recommendations: { action: string; impact: string; priority: string }[];
  market_notes: string;
};

type PropertyData = {
  id: string;
  address: string;
  type: string;
  year_built: number;
  beds: number;
  baths: number;
  sqft: number;
  current_rent: number;
  monthly_expenses: number;
  maintenance_count: number;
  occupied: boolean;
  building_name?: string;
};

const rentBadge: Record<string, { bg: string; text: string; label: string }> = {
  below_market: { bg: T.coralLight, text: T.coral, label: 'Below Market' },
  at_market: { bg: T.greenLight, text: T.greenDark, label: 'At Market' },
  above_market: { bg: T.tealLight, text: T.tealDark, label: 'Above Market' },
};

const priorityColor: Record<string, { bg: string; text: string }> = {
  high: { bg: T.coralLight, text: T.coral },
  medium: { bg: T.amberLight, text: T.amberDark },
  low: { bg: T.tealLight, text: T.tealDark },
};

export default function PropertyValuation() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [valuations, setValuations] = useState<Record<string, Valuation>>({});
  const [error, setError] = useState('');

  useEffect(() => { fetchProperties(); }, []);

  const fetchProperties = async () => {
    setLoading(true);
    // Get buildings/units and enrich with lease + maintenance data
    const [bRes, uRes, lRes, mRes, eRes] = await Promise.all([
      supabase.from('buildings').select('id, address, name, type, year_built, mortgage, insurance, hoa_fee'),
      supabase.from('properties').select('id, address, unit_number, building_id, beds, baths, sqft, current_rent'),
      supabase.from('leases').select('property, rent, status'),
      supabase.from('maintenance').select('property, status'),
      supabase.from('expenses').select('property, amount'),
    ]);

    const buildings = bRes.data || [];
    const units = uRes.data || [];
    const leases = lRes.data || [];
    const maintenance = mRes.data || [];
    const expenses = eRes.data || [];

    const props: PropertyData[] = [];

    // Add buildings as properties
    buildings.forEach(b => {
      const bUnits = units.filter(u => u.building_id === b.id);
      const totalRent = bUnits.reduce((s, u) => s + (u.current_rent || 0), 0);
      const monthlyExpenses = (b.mortgage || 0) + (b.insurance || 0) + (b.hoa_fee || 0);
      const addr = b.address || '';
      const maintCount = maintenance.filter(m => m.property?.includes(addr.split(',')[0]) && m.status !== 'resolved').length;
      const hasLease = leases.some(l => l.property?.includes(addr.split(',')[0]) && l.status !== 'expired');

      props.push({
        id: b.id,
        address: b.address,
        type: b.type || 'Residential',
        year_built: b.year_built || 0,
        beds: bUnits.reduce((s, u) => s + (u.beds || 0), 0),
        baths: bUnits.reduce((s, u) => s + (u.baths || 0), 0),
        sqft: bUnits.reduce((s, u) => s + (u.sqft || 0), 0),
        current_rent: totalRent,
        monthly_expenses: monthlyExpenses,
        maintenance_count: maintCount,
        occupied: hasLease,
        building_name: b.name,
      });
    });

    // Add standalone units (no building)
    units.filter(u => !u.building_id).forEach(u => {
      const addr = u.address || '';
      const maintCount = maintenance.filter(m => m.property?.includes(addr.split(',')[0]) && m.status !== 'resolved').length;
      const lease = leases.find(l => l.property?.includes(addr.split(',')[0]) && l.status !== 'expired');
      const unitExpenses = expenses.filter(e => e.property?.includes(addr.split(',')[0]));
      const monthlyExp = unitExpenses.length > 0 ? unitExpenses.reduce((s, e) => s + (e.amount || 0), 0) / Math.max(unitExpenses.length, 1) : 0;

      props.push({
        id: u.id,
        address: u.address + (u.unit_number ? `, ${u.unit_number}` : ''),
        type: 'Residential',
        year_built: 0,
        beds: u.beds || 0,
        baths: u.baths || 0,
        sqft: u.sqft || 0,
        current_rent: u.current_rent || lease?.rent || 0,
        monthly_expenses: monthlyExp,
        maintenance_count: maintCount,
        occupied: !!lease,
      });
    });

    setProperties(props);
    if (props.length > 0 && !selectedId) setSelectedId(props[0].id);
    setLoading(false);
  };

  const runValuation = async (prop: PropertyData) => {
    setAnalyzing(true);
    setError('');
    setValuation(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAnalyzing(false); return; }

    try {
      const res = await fetch('/api/property-valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, property: prop }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.message || 'Valuation failed.');
      } else if (data.result) {
        setValuation(data.result);
        setValuations(prev => ({ ...prev, [prop.id]: data.result }));
      }
    } catch {
      setError('Failed to run valuation. Please try again.');
    }
    setAnalyzing(false);
  };

  const selected = properties.find(p => p.id === selectedId) || null;
  const currentValuation = selectedId ? (valuation && valuation === valuations[selectedId] ? valuation : valuations[selectedId] || null) : null;

  // Loading skeleton
  if (loading) return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        {[1,2].map(i => (
          <div key={i} style={{ ...card, height: 120 }}>
            <div style={{ height: 14, width: '60%', background: T.border, borderRadius: 6, marginBottom: 12 }} />
            <div style={{ height: 10, width: '100%', background: T.border, borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 10, width: '40%', background: T.border, borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* Error */}
      {error && (
        <div style={{ background: T.coralLight, border: `1px solid ${T.coral}33`, borderRadius: T.radiusSm, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: T.coral, fontWeight: 600 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: T.coral, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {properties.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 6 }}>No properties to value</div>
          <div style={{ color: T.inkMuted, fontSize: 13, maxWidth: 400, margin: '0 auto' }}>
            Add properties in your Portfolio first, then come back to get AI-powered valuation estimates.
          </div>
        </div>
      ) : (
        <div>
          {/* Property selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {properties.map(p => (
              <button key={p.id} onClick={() => { setSelectedId(p.id); setValuation(valuations[p.id] || null); }}
                style={{
                  padding: '8px 16px', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', fontFamily: 'inherit',
                  background: selectedId === p.id ? T.navy : T.bg,
                  color: selectedId === p.id ? '#fff' : T.inkMid,
                  border: `1px solid ${selectedId === p.id ? T.navy : T.border}`,
                }}>
                {p.building_name || p.address.split(',')[0]}
              </button>
            ))}
          </div>

          {selected && (
            <div>
              {/* Property info + run button */}
              <div style={{ ...card, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 4 }}>{selected.building_name || selected.address}</div>
                    <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 8 }}>{selected.address}</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: T.inkMid }}>
                      {selected.type && <span>{selected.type}</span>}
                      {selected.beds > 0 && <span>{selected.beds} bed</span>}
                      {selected.baths > 0 && <span>{selected.baths} bath</span>}
                      {selected.sqft > 0 && <span>{selected.sqft.toLocaleString()} sqft</span>}
                      {selected.year_built > 0 && <span>Built {selected.year_built}</span>}
                      <span style={{ color: selected.occupied ? T.greenDark : T.inkMuted }}>{selected.occupied ? 'Occupied' : 'Vacant'}</span>
                    </div>
                  </div>
                  <button onClick={() => runValuation(selected)} disabled={analyzing}
                    style={{ ...btn.primary, opacity: analyzing ? 0.7 : 1 }}>
                    {analyzing ? '✦ Analyzing...' : currentValuation ? '✦ Re-analyze' : '✦ Run AI Valuation'}
                  </button>
                </div>

                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
                  <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>${(selected.current_rent || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 2 }}>Monthly Rent</div>
                  </div>
                  <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>${(selected.monthly_expenses || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 2 }}>Monthly Expenses</div>
                  </div>
                  <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: selected.current_rent - selected.monthly_expenses > 0 ? T.greenDark : T.coral }}>
                      ${((selected.current_rent || 0) - (selected.monthly_expenses || 0)).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 2 }}>Net Cash Flow</div>
                  </div>
                  <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>{selected.maintenance_count}</div>
                    <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 2 }}>Open Issues</div>
                  </div>
                </div>
              </div>

              {/* Valuation results */}
              {currentValuation && (
                <div>
                  {/* Value estimate hero */}
                  <div style={{ background: T.navy, borderRadius: T.radiusLg, padding: isMobile ? 20 : 28, marginBottom: 16, color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: 14 }}>✦</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>AI Property Valuation</span>
                      <span style={{ background: T.teal, color: T.navy, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>AI</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: T.radiusSm, padding: 16, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Estimated Value</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
                          ${(currentValuation.estimated_value_low || 0).toLocaleString()} – ${(currentValuation.estimated_value_high || 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: T.radiusSm, padding: 16, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Market Rent</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: T.teal }}>
                          ${(currentValuation.estimated_monthly_rent || 0).toLocaleString()}/mo
                        </div>
                        {(() => {
                          const rb = rentBadge[currentValuation.rent_assessment] || rentBadge.at_market;
                          return (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: rb.bg, color: rb.text, marginTop: 6, display: 'inline-block' }}>
                              {rb.label} ({currentValuation.rent_difference_pct > 0 ? '+' : ''}{currentValuation.rent_difference_pct}%)
                            </span>
                          );
                        })()}
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: T.radiusSm, padding: 16, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Property Condition</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: (currentValuation.condition_score || 0) >= 80 ? T.teal : (currentValuation.condition_score || 0) >= 60 ? T.amber : T.coral }}>
                          {currentValuation.condition_score || '—'}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>/ 100</div>
                      </div>
                    </div>

                    {/* Investment metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10 }}>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{currentValuation.cap_rate || '—'}%</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Cap Rate</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{currentValuation.gross_rent_multiplier || '—'}x</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>GRM</div>
                      </div>
                      {!isMobile && (
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{currentValuation.cash_on_cash_note || '—'}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 2 }}>Returns</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Value drivers + risks */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div style={{ ...card }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Value Drivers</div>
                      {(currentValuation.value_drivers || []).map((d, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: 13, color: T.inkMid }}>
                          <span style={{ color: T.greenDark, fontWeight: 700, flexShrink: 0 }}>↑</span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ ...card }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Value Risks</div>
                      {(currentValuation.value_risks || []).map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: 13, color: T.inkMid }}>
                          <span style={{ color: T.coral, fontWeight: 700, flexShrink: 0 }}>↓</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {(currentValuation.recommendations || []).length > 0 && (
                    <div style={{ ...card, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 12 }}>Recommendations</div>
                      {currentValuation.recommendations.map((rec, i) => {
                        const pc = priorityColor[rec.priority] || priorityColor.medium;
                        return (
                          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottom: i < currentValuation.recommendations.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: pc.bg, color: pc.text, textTransform: 'uppercase', flexShrink: 0, marginTop: 2 }}>{rec.priority}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 2 }}>{rec.action}</div>
                              <div style={{ fontSize: 12, color: T.inkMuted }}>{rec.impact}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Market notes */}
                  {currentValuation.market_notes && (
                    <div style={{ ...card }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Market Context</div>
                      <div style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.7 }}>{currentValuation.market_notes}</div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div style={{ marginTop: 16, fontSize: 11, color: T.inkMuted, lineHeight: 1.6, textAlign: 'center' }}>
                    AI-generated estimate based on property data and general market metrics. Not a formal appraisal. Consult a licensed appraiser for official valuations.
                  </div>
                </div>
              )}

              {/* Analyzing state */}
              {analyzing && (
                <div style={{ ...card, textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 14, color: T.tealDark, fontWeight: 600, marginBottom: 8 }}>✦ Analyzing property data...</div>
                  <div style={{ fontSize: 12, color: T.inkMuted }}>Estimating value, rent comps, and investment metrics</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
