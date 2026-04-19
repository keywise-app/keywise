'use client';
import { useState } from 'react';
import { T } from '../lib/theme';
import Maintenance from './Maintenance';
import Expenses from './Expenses';
import Documents from './Documents';

export default function Operations() {
  const [tab, setTab] = useState<'maintenance' | 'expenses' | 'documents'>('maintenance');

  const tabs = [
    { id: 'maintenance', label: '🔧 Maintenance' },
    { id: 'expenses', label: '💰 Expenses' },
    { id: 'documents', label: '📁 Documents' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 4, width: 'fit-content', maxWidth: '100%', overflowX: 'auto' as const, boxShadow: T.shadow }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: tab === t.id ? T.navy : 'transparent',
              color: tab === t.id ? 'white' : T.inkMuted,
              transition: 'all 0.12s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'maintenance' && <Maintenance />}
      {tab === 'expenses' && <Expenses />}
      {tab === 'documents' && <Documents />}
    </div>
  );
}
