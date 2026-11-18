'use client';
import { useState } from 'react';
import { rentSummary, localDate, RentEntry } from '@/lib/workspace/records';
import { T, card, btn } from '../../lib/theme';
export default function RentLedger({ payments, onOpen }: { payments: (RentEntry & { tenant_name?: string; property?: string })[]; onOpen?: (leaseId: string) => void }) {
 const [scope, setScope] = useState<'month' | 'all'>('month');
 const today = localDate();
 const entries = scope === 'month' ? payments.filter(p => p.due_date?.slice(0,7) === today.slice(0,7)) : payments;
 const totals = rentSummary(entries, today);
 const currency = (n: number) => n.toLocaleString('en-US',{ style: 'currency',currency: 'USD' });
 return <section style={{ ...card, marginBottom: 20 }}>
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
   <h3 style={{ margin: 0, color: T.navy }}>Rent ledger</h3>
   <select aria-label="Rent ledger period" value={scope} onChange={e => setScope(e.target.value as 'month' | 'all')}><option value="month">This month</option><option value="all">All recorded charges</option></select>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginTop: 14 }}>
   {([['Scheduled',totals.scheduled],['Recorded paid',totals.paid],['Outstanding',totals.outstanding],['Overdue',totals.overdue],['Processing',totals.processing]] as const).map(([name,value]) => <div key={name} style={{ background: T.bg, padding: 12, borderRadius: 8 }}><strong style={{ display: 'block', fontSize: 20, color: name === 'Overdue' && value > 0 ? T.coral : T.navy }}>{currency(value)}</strong><span style={{ fontSize: 12 }}>{name}</span></div>)}
  </div>
  <p style={{ color: T.inkMid, fontSize: 12 }}>Based on recorded charges and payments. Processing payments remain outstanding until confirmed. Unscheduled rent is excluded.</p>
  {entries.length === 0 && <p>No recorded charges for this period. Create a payment schedule to track rent due.</p>}
  {onOpen && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
   {[...new Set(entries.filter(p => rentSummary([p],today).overdue > 0 && p.lease_id).map(p => p.lease_id!))].map(id => <button key={id} style={btn.ghost} onClick={() => onOpen(id)}>Review {entries.find(p => p.lease_id === id)?.tenant_name || 'tenant'} balance →</button>)}
  </div>}
 </section>;
}
