'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { belongsToUnit, rentSummary } from '@/lib/workspace/records';
import HistoryExport from './HistoryExport';
import { T, btn, card } from '../../lib/theme';
export default function UnitRecords({ unit, onClose }: { unit: { id: string; address: string }; onClose: () => void }) {
 const [records, setRecords] = useState<Record<string, any[]>>({});
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(true);
 async function load() {
  setLoading(true); setError('');
  try {
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error('Sign in required.');
   const tables = ['leases','payments','documents','maintenance','expenses','workspace_tasks'];
   const results = await Promise.all(tables.map(table => supabase.from(table).select('*').eq('user_id',user.id)));
   if (results.some(r => r.error)) throw new Error('Some records could not be loaded.');
   const leases = (results[0].data || []).filter(r => belongsToUnit(r,unit));
   const leaseIds = new Set(leases.map(l => l.id));
   const mapped: Record<string, any[]> = {};
   tables.forEach((table,i) => { mapped[table] = (results[i].data || []).filter(r => r.lease_id ? leaseIds.has(r.lease_id) : belongsToUnit(r,unit)); });
   mapped.leases = leases; setRecords(mapped);
  } catch (e) { setError((e as Error).message); }
  finally { setLoading(false); }
 }
 useEffect(() => { void load(); }, [unit.id]);
 const navigate = (target: string) => window.dispatchEvent(new CustomEvent('kw:navigate',{detail:target}));
 return <div role="dialog" aria-modal="true" aria-label={`Records for ${unit.address}`} style={{ position: 'fixed', inset: 0, zIndex: 150, background: '#0F346080', padding: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onKeyDown={e => { if (e.key === 'Escape') onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
  <section style={{ ...card, width: 760, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
   <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><h2 style={{ margin: 0, color: T.navy }}>{unit.address}</h2><button autoFocus style={btn.ghost} onClick={onClose}>Close</button></div>
   {loading && <p role="status">Loading connected records…</p>}
   {error && <p role="alert">{error} <button style={btn.ghost} onClick={load}>Retry</button></p>}
   {!loading && !error && <>
    <p>Outstanding recorded balance: <strong>${rentSummary(records.payments || []).outstanding.toLocaleString()}</strong></p>
    <h3>Tenants and leases</h3>
    {records.leases?.length === 0 && <p>No linked leases. Add a tenant from this unit to connect a lease.</p>}
    {records.leases?.map(l => <div key={l.id} style={{ borderTop: `1px solid ${T.border}`, padding: 12, fontSize: 13 }}><strong>{l.tenant_name}</strong> · {l.start_date || '—'} to {l.end_date || 'Month to month'} · {l.archived ? 'Archived' : l.status}<div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>{[['overview','View lease'],['payments','Rent history'],['documents','Documents']].map(([tab,text]) => <button key={tab} style={btn.ghost} onClick={() => navigate(`tenants&lease=${l.id}&tab=${tab}`)}>{text} →</button>)}</div></div>)}
    {records.leases?.map(l=><HistoryExport key={l.id} leaseId={l.id}/>)}
    <h3>Maintenance</h3>
    {records.maintenance?.length === 0 && <p>No linked requests.</p>}
    {records.maintenance?.map(m => <div key={m.id} style={{ padding: '8px 0' }}><button style={btn.ghost} onClick={() => navigate(`operations&tab=maintenance&issue=${m.id}`)}>{m.issue} · {m.status} · ${Number(m.cost || 0).toLocaleString()} →</button></div>)}
    <h3>Documents and evidence</h3>
    {records.documents?.length === 0 && <p>No linked documents.</p>}
    {records.documents?.map(d => <div key={d.id} style={{ padding: '6px 0', fontSize: 13 }}>{d.name || d.type} <button style={btn.ghost} disabled={!d.file_path} onClick={async () => { const { data,error } = await supabase.storage.from('documents').createSignedUrl(d.file_path,300); if (error || !data?.signedUrl) setError('Unable to open document.'); else window.open(data.signedUrl,'_blank','noopener,noreferrer'); }}>View</button></div>)}
    <h3>Costs</h3><p style={{ fontSize: 13 }}>Recorded expenses: ${records.expenses?.reduce((s,e) => s + Number(e.amount || 0),0).toLocaleString()}. Maintenance costs remain in the request history and are not added again.</p>
    <h3>Tasks</h3>{records.workspace_tasks?.length === 0 && <p>No linked tasks.</p>}{records.workspace_tasks?.map(t => <p key={t.id} style={{ fontSize: 13 }}>{t.completed_at ? '✓' : '○'} {t.title} · {t.due_date}</p>)}
   </>}
  </section>
 </div>;
}
