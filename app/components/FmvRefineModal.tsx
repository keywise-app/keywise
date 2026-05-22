'use client';
import { useState } from 'react';
import { T, btn, input, label } from '../lib/theme';

export type FmvContext = {
  improvements: string;
  issues: string;
  localContext: string;
  tenantNotes: string;
  knownComps: string;
  pricingStrategy: string;
  customNotes: string;
};

const EMPTY_CONTEXT: FmvContext = {
  improvements: '', issues: '', localContext: '', tenantNotes: '',
  knownComps: '', pricingStrategy: '', customNotes: '',
};

export default function FmvRefineModal({
  onRun,
  onClose,
}: {
  onRun: (context: FmvContext) => void;
  onClose: () => void;
}) {
  const [ctx, setCtx] = useState<FmvContext>({ ...EMPTY_CONTEXT });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={onClose}>
      <div style={{ background: T.surface, borderRadius: 16, padding: 28, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(15,52,96,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: T.navy }}>Refine Your Analysis</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: T.inkMuted, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>Add context to get a more accurate estimate. All fields optional.</div>

        {([
          { key: 'improvements', lbl: 'Recent improvements', ph: 'e.g. kitchen reno 2024, new HVAC, fresh paint' },
          { key: 'issues', lbl: 'Known issues', ph: 'e.g. deferred roof maintenance, old appliances' },
          { key: 'localContext', lbl: 'Local context', ph: 'e.g. new park 2 blocks away, school district upgraded' },
          { key: 'tenantNotes', lbl: 'Tenant quality', ph: 'e.g. long-term tenant, always pays early, takes care of property' },
          { key: 'knownComps', lbl: 'Comparable rentals you know about', ph: 'e.g. unit across street rents for $2400, similar 2bd/1ba' },
          { key: 'customNotes', lbl: 'Anything else', ph: 'Other context the AI should know' },
        ] as const).map(f => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label style={label}>{f.lbl}</label>
            <textarea value={ctx[f.key]} onChange={e => setCtx(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.ph} style={{ ...input, minHeight: 50, resize: 'vertical' as const }} />
          </div>
        ))}

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Pricing strategy</label>
          <select value={ctx.pricingStrategy} onChange={e => setCtx(prev => ({ ...prev, pricingStrategy: e.target.value }))} style={input}>
            <option value="">No preference</option>
            <option value="Maximize revenue">Maximize revenue</option>
            <option value="Retain tenant">Retain good tenant</option>
            <option value="Match market exactly">Match market exactly</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onRun(ctx)} style={{ ...btn.primary, flex: 1 }}>
            🔍 Run Analysis
          </button>
          <button onClick={() => onRun({ ...EMPTY_CONTEXT })} style={{ ...btn.ghost, flex: 1 }}>
            Skip and run analysis
          </button>
        </div>
      </div>
    </div>
  );
}
