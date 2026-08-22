'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const TEAL_LIGHT = '#E0FAF5';
const BG = '#F0F4FF';
const SURFACE = '#FFFFFF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';
const CORAL = '#FF6B6B';

interface RentCalc {
  id: string;
  created_at: string;
  address: string | null;
  current_rent: number | null;
  max_legal_rent: number | null;
  max_increase_percent: number | null;
  max_increase_amount: number | null;
  cpi_used: number | null;
  region: string | null;
  is_exempt: boolean;
  exemption_reason: string | null;
  property_type: string | null;
  notice_type: string | null;
  property_id: string | null;
  year_built: number | null;
  last_increase_date: string | null;
}

const REGION_LABELS: Record<string, string> = {
  'los-angeles': 'Los Angeles',
  'bay-area': 'Bay Area',
  'san-diego': 'San Diego',
  'other-ca': 'Other CA',
};

const PROP_LABELS: Record<string, string> = {
  'multi-family': 'Multi-family',
  'sfh': 'Single-family',
  'condo': 'Condo',
  'owner-occupied-small': 'Owner-occupied small',
  'mobile-home': 'Mobile home',
};

export default function RentCalculationsPage() {
  const [calcs, setCalcs] = useState<RentCalc[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);
      supabase.from('rent_calculations')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setCalcs(data || []);
          setLoading(false);
        });
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this calculation?')) return;
    setDeleting(id);
    await supabase.from('rent_calculations').delete().eq('id', id);
    setCalcs(prev => prev.filter(c => c.id !== id));
    setDeleting(null);
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: BG, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ background: N, padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill={N}/>
            <circle cx="13" cy="16" r="5.5" fill="none" stroke={TEAL} strokeWidth="2.5"/>
            <circle cx="13" cy="16" r="2" fill={TEAL}/>
            <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={TEAL}/>
            <rect x="22" y="17.25" width="4" height="2" rx="1" fill={TEAL}/>
            <rect x="19" y="17.25" width="2.5" height="2" rx="1" fill={TEAL}/>
          </svg>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Keywise</span>
        </a>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/compliance" style={{ color: '#fff', fontSize: 13, textDecoration: 'none', opacity: 0.7 }}>← Compliance</a>
          <a href="/tools/ca/ab1482-calculator"
            style={{ background: TEAL, color: N, textDecoration: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700 }}>
            + New Calculation
          </a>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: N, margin: '0 0 8px', letterSpacing: '-0.6px' }}>Rent Cap Calculations</h1>
        <p style={{ fontSize: 15, color: INK_MID, margin: '0 0 32px' }}>Every AB 1482 calculation you&apos;ve run, saved to your account.</p>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: INK_MUTED, fontSize: 14 }}>Loading…</div>
        )}

        {!loading && authed === false && (
          <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: N, marginBottom: 12 }}>Sign in to see your calculations</div>
            <a href="/?login=true"
              style={{ display: 'inline-block', background: N, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700 }}>
              Log In →
            </a>
          </div>
        )}

        {!loading && authed && calcs.length === 0 && (
          <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: N, marginBottom: 12 }}>No calculations yet</div>
            <div style={{ fontSize: 15, color: INK_MID, marginBottom: 24, maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.65 }}>
              Run the AB 1482 rent cap calculator to see your maximum legal rent increase for any property. Calculations are saved automatically when you&apos;re signed in.
            </div>
            <a href="/tools/ca/ab1482-calculator"
              style={{ display: 'inline-block', background: N, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700 }}>
              Run First Calculation →
            </a>
          </div>
        )}

        {!loading && authed && calcs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {calcs.map(c => (
              <div key={c.id} style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, padding: '20px 24px', boxShadow: '0 2px 8px rgba(15,52,96,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    {/* Address / label */}
                    <div style={{ fontWeight: 700, fontSize: 16, color: N, marginBottom: 4 }}>
                      {c.address || (PROP_LABELS[c.property_type || ''] || 'Property')}
                    </div>
                    <div style={{ fontSize: 12, color: INK_MUTED, marginBottom: 14 }}>
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {c.region ? ` · ${REGION_LABELS[c.region] || c.region}` : ''}
                      {c.year_built ? ` · Built ${c.year_built}` : ''}
                    </div>

                    {c.is_exempt ? (
                      <div style={{ background: '#FFF8E0', border: '1px solid #F0C000', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#7A5500', lineHeight: 1.5 }}>
                        ⚠️ Exempt — {c.exemption_reason}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                        <div style={{ background: BG, borderRadius: 10, padding: '10px 16px', minWidth: 120 }}>
                          <div style={{ fontSize: 11, color: INK_MUTED, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 4 }}>Current Rent</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: N }}>${(c.current_rent ?? 0).toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', color: INK_MUTED, fontSize: 20 }}>→</div>
                        <div style={{ background: TEAL_LIGHT, borderRadius: 10, padding: '10px 16px', minWidth: 120, border: `1px solid ${TEAL}33` }}>
                          <div style={{ fontSize: 11, color: TEAL_DARK, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 4 }}>Max Legal Rent</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: N }}>${(c.max_legal_rent ?? 0).toLocaleString()}</div>
                        </div>
                        <div style={{ background: BG, borderRadius: 10, padding: '10px 16px' }}>
                          <div style={{ fontSize: 11, color: INK_MUTED, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 4 }}>Increase</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F7040' }}>+{c.max_increase_percent}%</div>
                        </div>
                      </div>
                    )}

                    {c.notice_type && !c.is_exempt && (
                      <div style={{ marginTop: 12, fontSize: 12, color: INK_MID }}>
                        ⚖️ {c.notice_type}
                        {c.cpi_used ? ` · CPI: ${c.cpi_used}%` : ''}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <a href="/tools/ca/ab1482-calculator"
                      style={{ background: BG, color: N, textDecoration: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, border: `1px solid ${BORDER}`, textAlign: 'center' as const }}>
                      Re-run
                    </a>
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                      style={{ background: 'none', color: CORAL, border: `1px solid ${CORAL}44`, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: deleting === c.id ? 0.5 : 1 }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
