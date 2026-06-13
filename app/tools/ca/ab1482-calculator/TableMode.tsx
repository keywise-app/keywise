'use client';

import { useState, useCallback, useEffect } from 'react';
import { calculateAB1482, AB1482Input } from '../../../../lib/compliance/ca/ab1482-calculator';
import { RentCapResult } from '../../../../lib/compliance/types';
import ComplianceSaveButton from './ComplianceSaveButton';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const TEAL_LIGHT = '#E0FAF5';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';
const CORAL = '#FF6B6B';
const GREEN_LIGHT = '#E8F8F0';
const GREEN_DARK = '#00875A';

const cellInput: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 6,
  padding: '7px 8px',
  fontSize: 13,
  color: INK,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
};

const cellSelect: React.CSSProperties = {
  ...cellInput,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238892A4' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
};

const sharedInput: React.CSSProperties = {
  boxSizing: 'border-box',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 15,
  color: INK,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
};

const sharedSelect: React.CSSProperties = {
  ...sharedInput,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238892A4' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: N,
  marginBottom: 6,
  display: 'block',
};

interface RowData {
  id: string;
  nickname: string;
  zip: string;
  yearBuilt: string;
  propertyType: AB1482Input['propertyType'];
  currentRent: string;
  effectiveDate: string;
  lastIncreaseDate: string;
  lastIncreaseAmount: string;
}

interface RowResult {
  input: AB1482Input;
  result: RentCapResult;
}

function makeEmptyRow(): RowData {
  return {
    id: Math.random().toString(36).substring(2, 9),
    nickname: '',
    zip: '',
    yearBuilt: '',
    propertyType: 'multifamily',
    currentRent: '',
    effectiveDate: '',
    lastIncreaseDate: '',
    lastIncreaseAmount: '',
  };
}

function computeRow(row: RowData, ownerType: AB1482Input['ownerType'], defaultEffectiveDate: string): RowResult | null {
  if (!row.zip || row.zip.length !== 5 || !row.yearBuilt) return null;
  const input: AB1482Input = {
    zipCode: row.zip,
    yearBuilt: parseInt(row.yearBuilt, 10) || 0,
    propertyType: row.propertyType,
    ownerType,
    currentRent: parseFloat(row.currentRent.replace(/[^0-9.]/g, '')) || 0,
    effectiveDate: row.effectiveDate || defaultEffectiveDate || new Date().toISOString().split('T')[0],
    lastIncreaseDate: row.lastIncreaseDate || null,
    lastIncreaseAmount: row.lastIncreaseAmount ? (parseFloat(row.lastIncreaseAmount) || null) : null,
  };
  const result = calculateAB1482(input);
  return { input, result };
}

function formatCompactResult(r: RentCapResult): { text: string; color: string } {
  if (!r.eligible) {
    if (r.localOrdinance) {
      return { text: `\u26A0 ${r.localOrdinance.city} RSO`, color: '#7A5C00' };
    }
    const reason = r.exemptionReason?.includes('15-year') ? '15yr' :
      r.exemptionReason?.includes('Single-family') ? 'SFH' :
      r.exemptionReason?.includes('duplex') ? 'Duplex' : 'Exempt';
    return { text: `\u2717 Exempt (${reason})`, color: CORAL };
  }
  if (r.localOverrides && r.localOrdinance) {
    return {
      text: `\u26A0 ${r.localOrdinance.city} RSO: $${r.maxIncreaseDollars?.toLocaleString()} (${r.applicableCap}%)`,
      color: '#7A5C00',
    };
  }
  const notice = r.noticeRequired || 30;
  return {
    text: `\u2713 $${r.maxNewRent?.toLocaleString()} (${r.applicableCap}%, ${notice}d)`,
    color: GREEN_DARK,
  };
}

export default function TableMode() {
  const [ownerType, setOwnerType] = useState<AB1482Input['ownerType']>('individual');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<RowData[]>([makeEmptyRow(), makeEmptyRow()]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const updateRow = useCallback((id: string, field: keyof RowData, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()]);
  const removeRow = (id: string) => setRows(prev => prev.length <= 1 ? prev : prev.filter(r => r.id !== id));

  // Compute results for all rows
  const rowResults: Map<string, RowResult> = new Map();
  rows.forEach(row => {
    const res = computeRow(row, ownerType, effectiveDate);
    if (res) rowResults.set(row.id, res);
  });

  const allCalcs = rows
    .filter(r => rowResults.has(r.id))
    .map(r => {
      const rr = rowResults.get(r.id)!;
      return { input: rr.input, result: rr.result, nickname: r.nickname || `Unit (${r.zip})` };
    });

  const expandedResult = expandedRowId ? rowResults.get(expandedRowId) : null;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Shared inputs */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: N, marginBottom: 14 }}>Shared settings</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Owner type</label>
            <select style={sharedSelect} value={ownerType} onChange={e => setOwnerType(e.target.value as AB1482Input['ownerType'])}>
              <option value="individual">Individual / Trust</option>
              <option value="llc-no-corp">LLC (no corporate members)</option>
              <option value="corporation">Corporation / REIT / LLC with corporate member</option>
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Default effective date</label>
            <input style={sharedInput} type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
            <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 4 }}>Per-property dates override this default</div>
          </div>
        </div>
      </div>

      {/* Property cards */}
      <style>{`.ab1482-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } @media (min-width: 640px) { .ab1482-grid { grid-template-columns: repeat(4, 1fr); } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(row => {
          const rr = rowResults.get(row.id);
          const compact = rr ? formatCompactResult(rr.result) : null;
          const isExpanded = expandedRowId === row.id;
          return (
            <div key={row.id} style={{ border: `1px solid ${isExpanded ? TEAL : BORDER}`, borderRadius: 12, padding: 16, background: isExpanded ? TEAL_LIGHT + '22' : '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <input style={{ ...cellInput, flex: 1, fontWeight: 600, fontSize: 14 }} placeholder="Property nickname (e.g. Unit A)" value={row.nickname} onChange={e => updateRow(row.id, 'nickname', e.target.value)} />
                <button
                  onClick={() => removeRow(row.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_MUTED, fontSize: 18, fontFamily: 'inherit', marginLeft: 8, padding: '2px 6px' }}
                  title="Remove"
                >
                  &times;
                </button>
              </div>
              <div className="ab1482-grid">
                <div>
                  <label style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600 }}>Zip Code</label>
                  <input style={cellInput} maxLength={5} inputMode="numeric" placeholder="92629" value={row.zip} onChange={e => updateRow(row.id, 'zip', e.target.value.replace(/\D/g, ''))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600 }}>Year Built</label>
                  <input style={cellInput} maxLength={4} inputMode="numeric" placeholder="1995" value={row.yearBuilt} onChange={e => updateRow(row.id, 'yearBuilt', e.target.value.replace(/\D/g, ''))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600 }}>Property Type</label>
                  <select style={cellSelect} value={row.propertyType} onChange={e => updateRow(row.id, 'propertyType', e.target.value as AB1482Input['propertyType'])}>
                    <option value="multifamily">Multifamily</option>
                    <option value="duplex">Duplex</option>
                    <option value="duplex-owner-occupied">Duplex (owner-occupied)</option>
                    <option value="single-family">Single-family</option>
                    <option value="condo">Condo</option>
                    <option value="mobile-home">Mobile home</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600 }}>Current Rent ($)</label>
                  <input style={cellInput} inputMode="decimal" placeholder="2500" value={row.currentRent} onChange={e => updateRow(row.id, 'currentRent', e.target.value.replace(/[^0-9.]/g, ''))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600 }}>Effective Date</label>
                  <input style={cellInput} type="date" value={row.effectiveDate} onChange={e => updateRow(row.id, 'effectiveDate', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600 }}>Last Increase Date</label>
                  <input style={cellInput} type="date" value={row.lastIncreaseDate} onChange={e => updateRow(row.id, 'lastIncreaseDate', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: INK_MUTED, fontWeight: 600 }}>Last Increase ($)</label>
                  <input style={cellInput} inputMode="decimal" placeholder="150" value={row.lastIncreaseAmount} onChange={e => updateRow(row.id, 'lastIncreaseAmount', e.target.value.replace(/[^0-9.]/g, ''))} />
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {compact ? (
                  <button
                    onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                    style={{ background: compact.color === GREEN_DARK ? GREEN_LIGHT : compact.color === CORAL ? '#FFEDED' : '#FFF9E6', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: compact.color, padding: '6px 14px', borderRadius: 8 }}
                  >
                    {compact.text} {isExpanded ? '▴' : '▾'}
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: INK_MUTED }}>Fill zip + year built to calculate</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Expanded detail for a row */}
        {expandedRowId && expandedResult && (
          <div style={{ borderTop: `2px solid ${TEAL}`, padding: 20, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: N }}>
                Detail: {rows.find(r => r.id === expandedRowId)?.nickname || 'Unit'}
              </div>
              <button
                onClick={() => setExpandedRowId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_MUTED, fontSize: 13, fontFamily: 'inherit' }}
              >
                Close
              </button>
            </div>

            {!expandedResult.result.eligible ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>&times;</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: N }}>Exempt from AB 1482</div>
                </div>
                <p style={{ fontSize: 13, color: INK_MID, lineHeight: 1.6 }}>{expandedResult.result.exemptionReason}</p>
                {expandedResult.result.localOrdinance && (
                  <div style={{ background: '#FFF9E6', border: '1px solid #F5D67A', borderRadius: 10, padding: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#7A5C00', marginBottom: 4 }}>Local rent control may still apply</div>
                    <p style={{ fontSize: 12, color: INK_MID, margin: 0 }}>
                      Your property is in <strong>{expandedResult.result.localOrdinance.city}</strong> ({expandedResult.result.localOrdinance.note}).
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Main result */}
                <div style={{ background: TEAL_LIGHT, border: `1.5px solid ${TEAL}`, borderRadius: 10, padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                    {expandedResult.result.localOverrides ? `${expandedResult.result.localOrdinance?.city} Rent Control` : 'AB 1482 Maximum'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: N }}>${expandedResult.result.maxNewRent?.toLocaleString()}</span>
                    <span style={{ fontSize: 13, color: INK_MID }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 13, color: INK_MID, marginTop: 4 }}>
                    Increase: <strong>${expandedResult.result.maxIncreaseDollars?.toLocaleString()}</strong> ({expandedResult.result.applicableCap}%)
                  </div>
                </div>

                {/* Formula */}
                <div style={{ background: BG, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: N, marginBottom: 6 }}>How we calculated this</div>
                  <pre style={{ fontSize: 12, color: INK_MID, lineHeight: 1.7, margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
                    {expandedResult.result.formulaBreakdown}
                  </pre>
                  <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 6 }}>CPI region: {expandedResult.result.cpiRegion}</div>
                </div>

                {/* Notice */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Notice</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: N }}>{expandedResult.result.noticeRequired} days</div>
                  </div>
                  <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: INK_MUTED, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Earliest Effective</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: N }}>
                      {expandedResult.result.earliestEffectiveDate
                        ? new Date(expandedResult.result.earliestEffectiveDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '\u2014'}
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {expandedResult.result.cpiPending && (
                  <div style={{ background: '#FFF9E6', border: '1px solid #F5D67A', borderRadius: 10, padding: 12, fontSize: 12, color: '#7A5C00' }}>
                    CPI data pending for this region. Using pre-August rate as estimate.
                  </div>
                )}
                {expandedResult.result.doubleIncreaseWarning && (
                  <div style={{ background: '#FFEDED', border: `1px solid ${CORAL}44`, borderRadius: 10, padding: 12, fontSize: 12, color: CORAL }}>
                    Combined 12-month limit: remaining room is <strong>${expandedResult.result.doubleIncreaseWarning.remainingDollars.toLocaleString()}</strong> ({expandedResult.result.doubleIncreaseWarning.remainingPercent}%).
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add row button */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${BORDER}` }}>
          <button
            onClick={addRow}
            style={{ background: 'none', border: `1.5px dashed ${BORDER}`, borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, color: N, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
          >
            + Add row
          </button>
        </div>
      </div>

      {/* Save */}
      {allCalcs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <ComplianceSaveButton calculations={allCalcs} />
        </div>
      )}
    </div>
  );
}
