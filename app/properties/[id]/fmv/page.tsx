'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const TEAL_LIGHT = '#E0FAF5';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';
const WARN_BG = '#FFF9E6';
const WARN_BORDER = '#F5D67A';

type PropertyData = {
  id: string;
  address: string;
  unit_number: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  current_rent: number | null;
  target_rent: number | null;
  estimated_market_rent: number | null;
  fmv_cache: any | null;
  fmv_calculated_at: string | null;
  differentiators: string | null;
};

export default function FmvOverridePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overrideRaw, setOverrideRaw] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showComps, setShowComps] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please log in to view this page.'); setLoading(false); return; }

      const res = await fetch(`/api/properties/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setError(res.status === 404 ? 'Property not found.' : 'Failed to load property.');
        setLoading(false);
        return;
      }
      const data: PropertyData = await res.json();
      setProperty(data);
      setOverrideRaw(String(data.target_rent || data.estimated_market_rent || data.fmv_cache?.estimated_market_rent || ''));
      setLoading(false);
    })();
  }, [id]);

  const fmvData = property?.fmv_cache;
  const fmvEstimate = property?.estimated_market_rent || fmvData?.estimated_market_rent || 0;
  const overrideVal = parseInt(overrideRaw.replace(/\D/g, ''), 10) || 0;
  const diff = overrideVal - fmvEstimate;
  const diffAbs = Math.abs(diff);
  const diffLabel =
    diff === 0
      ? 'Matches the AI estimate.'
      : diff > 0
      ? `You're setting rent $${diffAbs.toLocaleString()} above the AI estimate.`
      : `You're setting rent $${diffAbs.toLocaleString()} below the AI estimate.`;

  const handleApply = async () => {
    if (!property) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Session expired. Please log in again.'); return; }

      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ target_rent: overrideVal }),
      });
      if (!res.ok) { setError('Failed to save. Please try again.'); return; }

      setProperty({ ...property, target_rent: overrideVal });
      setConfirmOpen(false);
      setApplied(true);
    } finally {
      setSaving(false);
    }
  };

  const estimatedAt = property?.fmv_calculated_at
    ? new Date(property.fmv_calculated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : fmvData?.analysis_date || null;

  const displayAddress = property?.address || '';
  const displayUnit = property?.unit_number ? `Unit ${property.unit_number}` : '';

  if (loading) {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK_MID }}>
        <p>Loading property…</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: INK_MID, gap: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: N }}>{error || 'Property not found.'}</p>
        <Link href="/" style={{ fontSize: 14, color: TEAL_DARK, textDecoration: 'none', fontWeight: 500 }}>← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: '#fff',
        color: N,
        minHeight: '100vh',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Nav */}
      <nav
        style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: '0 40px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: N,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <circle cx="13" cy="16" r="5.5" fill="none" stroke={TEAL} strokeWidth="2.5" />
              <circle cx="13" cy="16" r="2" fill={TEAL} />
              <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={TEAL} />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: N, letterSpacing: '-0.3px' }}>
            keywise
          </span>
        </Link>
        <Link
          href="/"
          style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}
        >
          ← Back to dashboard
        </Link>
      </nav>

      <main
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '52px 24px 100px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: TEAL_DARK,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: 10,
            }}
          >
            Fair Market Value
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: N,
              letterSpacing: '-0.8px',
              margin: '0 0 8px',
              lineHeight: 1.15,
            }}
          >
            {displayAddress}
          </h1>
          {displayUnit && <p style={{ fontSize: 15, color: INK_MID, margin: 0 }}>{displayUnit}</p>}
          {property.current_rent != null && property.current_rent > 0 && (
            <p style={{ fontSize: 13, color: INK_MUTED, margin: '6px 0 0' }}>
              Current rent: ${property.current_rent.toLocaleString()}/mo
            </p>
          )}
        </div>

        {/* FMV Estimate card */}
        {fmvEstimate > 0 ? (
          <div
            style={{
              background: TEAL_LIGHT,
              border: `1.5px solid ${TEAL}`,
              borderRadius: 14,
              padding: '24px 28px',
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
              AI Estimate
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: N, letterSpacing: '-1px' }}>
                ${fmvEstimate.toLocaleString()}
              </span>
              <span style={{ fontSize: 15, color: INK_MID }}>/mo</span>
            </div>

            {/* Confidence + range */}
            {fmvData && (fmvData.market_rent_low || fmvData.data_confidence) && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 10 }}>
                {fmvData.market_rent_low && fmvData.market_rent_high && (
                  <span style={{ fontSize: 13, color: INK_MID }}>
                    Range: ${fmvData.market_rent_low.toLocaleString()} – ${fmvData.market_rent_high.toLocaleString()}/mo
                  </span>
                )}
                {fmvData.data_confidence && (
                  <span style={{
                    fontSize: 12, padding: '1px 8px', borderRadius: 10, fontWeight: 600,
                    background: fmvData.data_confidence === 'high' ? '#E8F8F0' : fmvData.data_confidence === 'medium' ? '#FFF8E0' : '#FFF0F0',
                    color: fmvData.data_confidence === 'high' ? '#0F7040' : fmvData.data_confidence === 'medium' ? '#9A6500' : '#CC3333',
                  }}>
                    {fmvData.data_confidence} confidence
                  </span>
                )}
              </div>
            )}

            <p style={{ fontSize: 13, color: INK_MID, margin: 0 }}>
              Based on {fmvData?.reasoning?.length || 'multiple'} factors
              {estimatedAt ? ` · estimated ${estimatedAt}` : ''}
            </p>

            {/* Expandable analysis details */}
            {fmvData && (
              <div style={{ marginTop: 16 }}>
                <button onClick={() => setShowComps(!showComps)}
                  style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: TEAL_DARK, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                  {showComps ? '▾ Hide analysis details' : '▸ Show analysis details'}
                </button>
                {showComps && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${TEAL}44` }}>
                    {fmvData.neighborhood_trends && (
                      <p style={{ fontSize: 13, color: INK_MID, margin: '0 0 12px', lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 600 }}>Trends:</span> {fmvData.neighborhood_trends}
                      </p>
                    )}
                    {fmvData.reasoning && fmvData.reasoning.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: N, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Factors</div>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: INK_MID, lineHeight: 1.7 }}>
                          {fmvData.reasoning.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    {fmvData.recommendations && (
                      <p style={{ fontSize: 13, color: INK_MID, margin: '12px 0 0', lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 600 }}>Recommendation:</span> {fmvData.recommendations}
                      </p>
                    )}
                    {fmvData.confidence_reasoning && (
                      <p style={{ fontSize: 12, color: INK_MUTED, margin: '12px 0 0', fontStyle: 'italic' }}>
                        {fmvData.confidence_reasoning}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background: BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: '24px 28px',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: N, margin: '0 0 6px' }}>No AI estimate yet</p>
            <p style={{ fontSize: 13, color: INK_MID, margin: 0 }}>
              Run a market analysis from your dashboard to get an AI-powered rent estimate for this unit.
            </p>
          </div>
        )}

        {/* Override input card */}
        <div
          style={{
            background: BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: '28px 28px',
            marginBottom: 20,
          }}
        >
          <label
            htmlFor="override-input"
            style={{ display: 'block', fontSize: 14, fontWeight: 700, color: N, marginBottom: 4 }}
          >
            Your target rent{' '}
            <span style={{ fontWeight: 400, color: INK_MUTED }}>(optional)</span>
          </label>
          <p style={{ fontSize: 13, color: INK_MID, margin: '0 0 14px' }}>
            {fmvEstimate > 0
              ? `AI suggests $${fmvEstimate.toLocaleString()} — adjust if you know your unit better.`
              : 'Set your target monthly rent for this unit.'}
          </p>

          {/* Currency input */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 15,
                fontWeight: 600,
                color: INK_MID,
                pointerEvents: 'none',
              }}
            >
              $
            </span>
            <input
              id="override-input"
              type="text"
              inputMode="numeric"
              value={overrideRaw}
              onChange={(e) => {
                setApplied(false);
                setOverrideRaw(e.target.value.replace(/[^0-9]/g, ''));
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: `1.5px solid ${BORDER}`,
                borderRadius: 10,
                padding: '12px 14px 12px 28px',
                fontSize: 22,
                fontWeight: 700,
                color: N,
                fontFamily: 'inherit',
                outline: 'none',
                background: '#fff',
              }}
              placeholder={fmvEstimate > 0 ? String(fmvEstimate) : '2000'}
              aria-label="Target monthly rent"
            />
          </div>

          {/* Neutral comparison nudge */}
          {overrideVal > 0 && fmvEstimate > 0 && (
            <p
              style={{
                fontSize: 13,
                color: diff === 0 ? TEAL_DARK : INK_MID,
                margin: '0 0 20px',
                fontWeight: 500,
              }}
            >
              {diffLabel}
            </p>
          )}

          {/* Apply CTA */}
          <button
            disabled={overrideVal <= 0 || applied || saving}
            onClick={() => setConfirmOpen(true)}
            style={{
              width: '100%',
              background: overrideVal > 0 && !applied ? N : '#C8CDD8',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '13px',
              fontSize: 14,
              fontWeight: 700,
              cursor: overrideVal > 0 && !applied ? 'pointer' : 'default',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            {applied ? `✓ Rent set to $${overrideVal.toLocaleString()}/mo` : saving ? 'Saving…' : 'Apply to property →'}
          </button>
        </div>

        {/* Confirmation modal (inline) */}
        {confirmOpen && (
          <div
            style={{
              background: WARN_BG,
              border: `1.5px solid ${WARN_BORDER}`,
              borderRadius: 14,
              padding: '24px 28px',
              marginBottom: 20,
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: N, margin: '0 0 8px' }}>
              Set rent to ${overrideVal.toLocaleString()}/mo for {displayUnit ? `${displayUnit}, ` : ''}{displayAddress}?
            </p>
            {diff !== 0 && fmvEstimate > 0 && (
              <p style={{ fontSize: 13, fontWeight: 600, color: diff > 0 ? '#9A6500' : TEAL_DARK, margin: '0 0 8px' }}>
                {diff > 0 ? '↑' : '↓'} ${diffAbs.toLocaleString()}/mo {diff > 0 ? 'above' : 'below'} AI estimate (${fmvEstimate.toLocaleString()})
              </p>
            )}
            <p style={{ fontSize: 13, color: INK_MID, margin: '0 0 20px' }}>
              This won't notify tenants.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleApply}
                disabled={saving}
                style={{
                  background: N,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 22px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: saving ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Yes, set rent'}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                style={{
                  background: 'transparent',
                  color: INK_MID,
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: '10px 22px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Applied success */}
        {applied && (
          <div
            style={{
              background: TEAL_LIGHT,
              border: `1.5px solid ${TEAL}`,
              borderRadius: 12,
              padding: '16px 22px',
              fontSize: 14,
              color: TEAL_DARK,
              fontWeight: 600,
            }}
          >
            ✓ Target rent saved. You can update this any time before collecting rent.
          </div>
        )}
      </main>
    </div>
  );
}
