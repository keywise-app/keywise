'use client';
import { useState, useRef, useEffect } from 'react';
import { T, input, label, btn } from '../lib/theme';

// Fields shown in the review panel after AI extraction.
// page: typical page in a residential lease where this appears.
// confidenceKey: if the raw value is empty/missing, field is low-confidence.
const REVIEW_FIELDS = [
  { label: 'Tenant Full Name', key: 'tenant_name', type: 'text',   page: 1 },
  { label: 'Property Address',  key: 'property',     type: 'text',   page: 1 },
  { label: 'Monthly Rent ($)',  key: 'rent',         type: 'number', page: 1 },
  { label: 'Security Deposit ($)', key: 'deposit',   type: 'number', page: 2 },
  { label: 'Lease Start Date',  key: 'start_date',   type: 'date',   page: 1 },
  { label: 'Lease End Date',    key: 'end_date',      type: 'date',   page: 1 },
  { label: 'Tenant Email',      key: 'email',         type: 'email',  page: 3 },
  { label: 'Tenant Phone',      key: 'phone',         type: 'text',   page: 3 },
] as const;

type FieldKey = typeof REVIEW_FIELDS[number]['key'];

type Props = {
  /** Values as returned by the extract-lease API (strings throughout) */
  extracted: Record<string, string>;
  /** Called when landlord confirms — receives the (possibly edited) values */
  onConfirm: (values: Record<string, string>) => void;
  /** Called when landlord wants to cancel / re-upload */
  onCancel: () => void;
  /** True while the parent is saving to Supabase */
  saving?: boolean;
};

export default function LeaseExtractionReview({ extracted, onConfirm, onCancel, saving }: Props) {
  // Working copy of values — starts from extracted, landlord edits flow here.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    REVIEW_FIELDS.forEach(f => { init[f.key] = extracted[f.key] ?? ''; });
    return init;
  });

  // Track which fields have been manually edited by the landlord.
  const [corrected, setCorrected] = useState<Set<string>>(new Set());

  // Which field is actively being edited (shows input instead of static text).
  const [editing, setEditing] = useState<string | null>(null);

  // Whether the landlord has scrolled past all low-confidence fields.
  const [scrolledPastWarnings, setScrolledPastWarnings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWarningRef = useRef<HTMLDivElement>(null);

  // Determine low-confidence fields: any field whose extracted value is empty.
  const lowConfidenceKeys = new Set(
    REVIEW_FIELDS.filter(f => !extracted[f.key]).map(f => f.key)
  );

  const hasLowConfidence = lowConfidenceKeys.size > 0;

  // Watch scroll to enable Confirm button after landlord has seen all warnings.
  useEffect(() => {
    if (!hasLowConfidence) { setScrolledPastWarnings(true); return; }
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const lastWarning = lastWarningRef.current;
      if (!lastWarning) return;
      const rect = lastWarning.getBoundingClientRect();
      const panelRect = el.getBoundingClientRect();
      if (rect.bottom <= panelRect.bottom + 40) setScrolledPastWarnings(true);
    };
    el.addEventListener('scroll', onScroll);
    // Also check on mount in case the panel is tall enough to show everything.
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasLowConfidence]);

  const handleChange = (key: string, val: string) => {
    setValues(v => ({ ...v, [key]: val }));
  };

  const handleBlur = (key: string, originalVal: string) => {
    setEditing(null);
    if (values[key] !== originalVal) {
      setCorrected(c => new Set(c).add(key));
    }
  };

  const confirmDisabled = saving || (!scrolledPastWarnings && hasLowConfidence);

  // Track index of the last low-confidence field so we can attach the ref.
  const lowConfidenceFieldIndices = REVIEW_FIELDS
    .map((f, i) => (lowConfidenceKeys.has(f.key) ? i : -1))
    .filter(i => i !== -1);
  const lastLowConfidenceIndex = lowConfidenceFieldIndices[lowConfidenceFieldIndices.length - 1] ?? -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          background: T.tealLight,
          border: `1px solid ${T.teal}44`,
          borderRadius: T.radiusSm,
          padding: '10px 14px',
          fontSize: 13,
          color: T.tealDark,
          fontWeight: 600,
          marginBottom: 16,
        }}>
          ✓ AI extracted these details from your lease. Click any value to correct it.
        </div>
        {hasLowConfidence && (
          <div style={{
            background: T.amberLight,
            border: `1px solid ${T.amber}66`,
            borderRadius: T.radiusSm,
            padding: '10px 14px',
            fontSize: 12,
            color: T.amberDark,
            fontWeight: 600,
          }}>
            ⚠ A few fields below need your attention — scroll down and double-check them.
          </div>
        )}
      </div>

      {/* Scrollable field list */}
      <div
        ref={containerRef}
        style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}
      >
        {REVIEW_FIELDS.map((field, idx) => {
          const isLowConf = lowConfidenceKeys.has(field.key);
          const isCorrected = corrected.has(field.key);
          const isEditing = editing === field.key;
          const originalVal = extracted[field.key] ?? '';
          const isLastLowConf = idx === lastLowConfidenceIndex;

          return (
            <div
              key={field.key}
              ref={isLastLowConf ? lastWarningRef : undefined}
              style={{
                background: T.surface,
                border: `1px solid ${isLowConf ? T.amber + '99' : T.border}`,
                borderRadius: T.radiusSm,
                padding: '11px 14px',
                cursor: isEditing ? 'default' : 'pointer',
                transition: 'border-color 0.15s',
              }}
              onClick={() => { if (!isEditing) setEditing(field.key); }}
            >
              {/* Row: label + badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ ...label, marginBottom: 0, flex: 1 }}>{field.label}</span>
                {isCorrected && (
                  <span style={{
                    fontSize: 11, background: T.tealLight, color: T.tealDark,
                    borderRadius: 6, padding: '2px 6px', fontWeight: 700,
                  }}>
                    ✏ edited
                  </span>
                )}
                {isLowConf && !isCorrected && (
                  <span style={{
                    fontSize: 11, background: T.amberLight, color: T.amberDark,
                    borderRadius: 6, padding: '2px 6px', fontWeight: 700,
                  }}>
                    Double-check this
                  </span>
                )}
              </div>

              {/* Value: input when editing, static text otherwise */}
              {isEditing ? (
                <input
                  autoFocus
                  type={field.type}
                  value={values[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  onBlur={() => handleBlur(field.key, originalVal)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { handleBlur(field.key, originalVal); }
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      handleBlur(field.key, originalVal);
                      const nextIdx = (idx + 1) % REVIEW_FIELDS.length;
                      setEditing(REVIEW_FIELDS[nextIdx].key);
                    }
                    if (e.key === 'Escape') { setEditing(null); }
                  }}
                  style={{
                    ...input,
                    padding: '6px 10px',
                    fontSize: 14,
                    fontWeight: 600,
                    borderColor: isLowConf ? T.amber : T.teal,
                    borderWidth: 2,
                    background: 'white',
                  }}
                />
              ) : (
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: values[field.key] ? T.ink : T.inkMuted,
                  borderBottom: isLowConf && !isCorrected ? `2px solid ${T.amber}` : 'none',
                  display: 'inline-block',
                  paddingBottom: isLowConf && !isCorrected ? 1 : 0,
                  minHeight: 22,
                }}>
                  {values[field.key] || <span style={{ fontStyle: 'italic', fontWeight: 400 }}>Not found — click to enter</span>}
                </div>
              )}

              {/* Source citation */}
              <div style={{ marginTop: 4, fontSize: 11, color: T.inkMuted }}>
                From page {field.page}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll hint when confirm is locked */}
      {hasLowConfidence && !scrolledPastWarnings && (
        <div style={{ textAlign: 'center', fontSize: 12, color: T.amberDark, marginTop: 10, fontWeight: 600 }}>
          ↓ Scroll down to review all flagged fields before saving
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          onClick={() => onConfirm(values)}
          disabled={confirmDisabled}
          style={{
            ...btn.primary,
            flex: 1,
            justifyContent: 'center',
            opacity: confirmDisabled ? 0.5 : 1,
            cursor: confirmDisabled ? 'not-allowed' : 'pointer',
            padding: '11px 20px',
            fontSize: 14,
          }}
        >
          {saving ? 'Saving…' : 'Save extracted details'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{ ...btn.ghost, padding: '11px 16px', fontSize: 14 }}
        >
          Re-upload
        </button>
      </div>

      {/* Correction summary */}
      {corrected.size > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: T.inkMuted, textAlign: 'center' }}>
          {corrected.size} field{corrected.size !== 1 ? 's' : ''} corrected by you · the rest are AI-extracted
        </div>
      )}
    </div>
  );
}
