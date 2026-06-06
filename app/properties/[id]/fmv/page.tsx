'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { use } from 'react';
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

// TODO: Replace with real data fetched by property id
const SAMPLE_PROPERTY = {
  address: '12B Maple Ave, Oakland CA 94601',
  unit: 'Unit 2B',
  fmvEstimate: 2850,
  compsUsed: 7,
  estimatedAt: 'May 16, 2026',
};

export default function FmvOverridePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // TODO: fetch real property + FMV estimate from Supabase by `id`
  const property = SAMPLE_PROPERTY;

  const [overrideRaw, setOverrideRaw] = useState<string>(String(property.fmvEstimate));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showComps, setShowComps] = useState(false);
  const [fmvData, setFmvData] = useState<any>(null);

  useEffect(() => {
    supabase.from('properties').select('fmv_cache').eq('id', id).maybeSingle().then(({ data }) => {
      if (data?.fmv_cache) setFmvData(data.fmv_cache);
    });
  }, [id]);

  const overrideVal = parseInt(overrideRaw.replace(/\D/g, ''), 10) || 0;
  const diff = overrideVal - property.fmvEstimate;
  const diffAbs = Math.abs(diff);
  const diffLabel =
    diff === 0
      ? 'Matches the local estimate.'
      : diff > 0
      ? `You're setting rent $${diffAbs.toLocaleString()} above the local estimate.`
      : `You're setting rent $${diffAbs.toLocaleString()} below the local estimate.`;

  const handleApply = () => {
    // TODO: write overrideVal to property record via API
    setConfirmOpen(false);
    setApplied(true);
  };

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
        {/* TODO: replace href with real property detail route */}
        <Link
          href={`/properties/${id}`}
          style={{ fontSize: 13, color: INK_MID, textDecoration: 'none', fontWeight: 500 }}
        >
          ← Back to property
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
            {property.address}
          </h1>
          <p style={{ fontSize: 15, color: INK_MID, margin: 0 }}>{property.unit}</p>
        </div>

        {/* FMV Estimate card */}
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
          {/* TODO: render real FMV estimate + confidence band from AI output */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: N, letterSpacing: '-1px' }}>
              ${property.fmvEstimate.toLocaleString()}
            </span>
            <span style={{ fontSize: 15, color: INK_MID }}>/mo</span>
          </div>
          <p style={{ fontSize: 13, color: INK_MID, margin: 0 }}>
            Based on {fmvData?.reasoning?.length || property.compsUsed} factors · estimated {property.estimatedAt}
          </p>

          {fmvData && (
            <div style={{ marginTop: 16 }}>
              <button onClick={() => setShowComps(!showComps)}
                style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: TEAL_DARK, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                {showComps ? '▾ Hide analysis details' : '▸ Show analysis details'}
              </button>
              {showComps && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${TEAL}44` }}>
                  {fmvData.market_rent_low && fmvData.market_rent_high && (
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: INK_MID }}>
                        <span style={{ fontWeight: 600 }}>Range:</span> ${fmvData.market_rent_low.toLocaleString()} – ${fmvData.market_rent_high.toLocaleString()}/mo
                      </div>
                      {fmvData.data_confidence && (
                        <div style={{ fontSize: 12, padding: '1px 8px', borderRadius: 10, background: fmvData.data_confidence === 'high' ? '#E8F8F0' : fmvData.data_confidence === 'medium' ? '#FFF8E0' : '#FFF0F0', color: fmvData.data_confidence === 'high' ? '#0F7040' : fmvData.data_confidence === 'medium' ? '#9A6500' : '#CC3333', fontWeight: 600 }}>
                          {fmvData.data_confidence} confidence
                        </div>
                      )}
                    </div>
                  )}
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
            AI suggests ${property.fmvEstimate.toLocaleString()} — adjust if you know your unit
            better.
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
              placeholder={String(property.fmvEstimate)}
              aria-label="Target monthly rent"
            />
          </div>

          {/* Neutral comparison nudge */}
          {overrideVal > 0 && (
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
            disabled={overrideVal <= 0 || applied}
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
            {applied ? `✓ Rent set to $${overrideVal.toLocaleString()}/mo` : 'Apply to property →'}
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
              Set rent to ${overrideVal.toLocaleString()}/mo for {property.unit},{' '}
              {property.address}?
            </p>
            {diff !== 0 && (
              <p style={{ fontSize: 13, fontWeight: 600, color: diff > 0 ? '#9A6500' : TEAL_DARK, margin: '0 0 8px' }}>
                {diff > 0 ? '↑' : '↓'} ${diffAbs.toLocaleString()}/mo {diff > 0 ? 'above' : 'below'} AI estimate (${property.fmvEstimate.toLocaleString()})
              </p>
            )}
            <p style={{ fontSize: 13, color: INK_MID, margin: '0 0 20px' }}>
              This won't notify tenants.
            </p>
            {/* TODO: wire handleApply to real API call (PATCH /api/properties/[id]) */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleApply}
                style={{
                  background: N,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 22px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Yes, set rent
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

        {/* TODO: show rent history / changelog for this property */}
      </main>
    </div>
  );
}
