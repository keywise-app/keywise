'use client';
import { localDate, rentSummary } from '@/lib/workspace/records';
import { T, card, btn } from '../../lib/theme';
export default function Attention({ leases, payments, maintenance, onNavigate }: { leases: any[]; payments: any[]; maintenance: any[]; onNavigate: (page: string) => void }) {
 const today = localDate();
 const active = leases.filter(l => !l.archived && l.status !== 'archived');
 const actions: { id: string; title: string; detail: string; action: string; target: string }[] = [];
 for (const lease of active) {
  const due = rentSummary(payments.filter(p => p.lease_id === lease.id),today).overdue;
  if (due) actions.push({ id: `pay-${lease.id}`, title: `${lease.tenant_name} · $${due.toLocaleString()} overdue`, detail: lease.property, action: 'Review balance',target: `tenants&lease=${lease.id}&tab=payments` });
  if (lease.end_date && lease.end_date >= today && lease.end_date <= localDate(new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()+90))) actions.push({ id: `lease-${lease.id}`, title: `${lease.tenant_name} · lease ends ${lease.end_date}`, detail: lease.property, action: 'Review lease',target: `tenants&lease=${lease.id}&tab=overview` });
 }
 for (const issue of maintenance.filter(m => m.status !== 'resolved').sort((a,b) => Number(b.priority === 'high') - Number(a.priority === 'high'))) actions.push({ id: issue.id, title: issue.issue, detail: `${issue.property || 'Maintenance'} · ${issue.priority} priority · ${issue.status}`, action: 'Update request',target: `operations&tab=maintenance&issue=${issue.id}` });
 return <section style={card}>
  <h3 style={{ marginTop: 0, color: T.navy }}>Needs attention <span style={{ color: T.inkMuted, fontSize: 13 }}>{actions.length} items</span></h3>
  {actions.length === 0 && <p style={{ fontSize: 13 }}>No overdue recorded rent, upcoming lease expirations or open maintenance requests.</p>}
  <div style={{ maxHeight: 420, overflowY: 'auto' }}>{actions.map(a => <div key={a.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', borderTop: `1px solid ${T.border}`, padding: '12px 0' }}>
   <div style={{ flex: '1 1 190px', fontSize: 13 }}><strong>{a.title}</strong><div style={{ marginTop: 4, color: T.inkMuted }}>{a.detail}</div></div>
   <button style={btn.ghost} onClick={() => onNavigate(a.target)}>{a.action} →</button>
  </div>)}</div>
 </section>;
}
