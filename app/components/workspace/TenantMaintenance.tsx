'use client';
import { useEffect, useState } from 'react';
import { workspaceApi } from '../../lib/workspace-api';
import { T, card, input, btn } from '../../lib/theme';
import MaintenanceHistory from './MaintenanceHistory';
export default function TenantMaintenance({ leaseId, readOnly }: { leaseId: string; readOnly: boolean }) {
 const [issues, setIssues] = useState<any[]>([]);
 const [text, setText] = useState('');
 const [priority, setPriority] = useState('medium');
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 const [loading, setLoading] = useState(true);
 const [expanded, setExpanded] = useState<string | null>(null);
 async function load() {
  try { const data = await workspaceApi(`/api/maintenance?lease_id=${encodeURIComponent(leaseId)}`); setIssues(data.issues); setError(''); }
  catch (e) { setError((e as Error).message); }
  finally { setLoading(false); }
 }
 useEffect(() => { void load(); }, [leaseId]);
 async function submit(e: React.FormEvent) {
  e.preventDefault(); setBusy(true); setError('');
  try { const data = await workspaceApi('/api/maintenance', { method: 'POST', body: JSON.stringify({ lease_id: leaseId, issue: text, priority }) }); setText(''); setExpanded(data.id); await load(); }
  catch (e) { setError((e as Error).message); }
  finally { setBusy(false); }
 }
 return <section style={{ ...card, marginBottom: 20 }}>
  <h3 style={{ color: T.navy, marginTop: 0 }}>Maintenance requests</h3>
  {!readOnly && <form onSubmit={submit}>
   <p style={{ fontSize: 13, color: T.inkMid }}>For immediate danger, call emergency services. Contact your landlord directly for urgent repairs.</p>
   <label style={{ fontSize: 13 }}>What needs fixing?<textarea required maxLength={3000} style={{ ...input, margin: '6px 0 12px', minHeight: 90 }} value={text} onChange={e => setText(e.target.value)} /></label>
   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
    <label style={{ fontSize: 13 }}>Priority <select style={{ ...input, width: 'auto' }} value={priority} onChange={e => setPriority(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
    <button style={btn.primary} disabled={busy || !text.trim()}>{busy ? 'Submitting…' : 'Submit request'}</button>
   </div>
   <p style={{ fontSize: 12, color: T.inkMuted }}>After submitting, open the request to add photos and follow updates.</p>
  </form>}
  {error && <p role="alert" style={{ color: T.coral }}>{error} <button style={btn.ghost} onClick={load}>Retry</button></p>}
  {loading && <p role="status">Loading requests…</p>}
  {!loading && !error && issues.length === 0 && <p>No requests yet.</p>}
  {issues.map(i => <article key={i.id} style={{ borderTop: `1px solid ${T.border}`, padding: '14px 0' }}>
   <button style={{ ...btn.ghost, width: '100%', textAlign: 'left' }} aria-expanded={expanded === i.id} onClick={() => setExpanded(expanded === i.id ? null : i.id)}>{i.issue} · {i.status} · {i.reported_date}</button>
   {expanded === i.id && <MaintenanceHistory id={i.id} tenant readOnly={readOnly} />}
  </article>)}
 </section>;
}
