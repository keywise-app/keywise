'use client';
import { useEffect, useState } from 'react';
import { workspaceApi } from '../../lib/workspace-api';
import RepairCompletion from './RepairCompletion';
import { T, btn, input } from '../../lib/theme';

export default function MaintenanceHistory({ id, tenant = false, readOnly = false }: { id: string; tenant?: boolean; readOnly?: boolean }) {
 const [issue,setIssue]=useState<any>(null);
 const [contractors,setContractors]=useState<any[]>([]);
 const [events, setEvents] = useState<any[]>([]);
 const [files, setFiles] = useState<any[]>([]);
 const [message, setMessage] = useState('');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(true);
 async function load() {
  try { const data = await workspaceApi(`/api/maintenance?id=${encodeURIComponent(id)}`); setEvents(data.events); setFiles(data.files);setIssue(data.issue || null);setContractors(data.contractors || []); setError(''); }
  catch (e) { setError((e as Error).message); }
  finally { setLoading(false); }
 }
 useEffect(() => { void load(); }, [id]);
 async function upload(file: File | undefined, type: string) {
  if (!file) return;
  setBusy(true); setError('');
  try { const form = new FormData(); form.set('id', id); form.set('type', type); form.set('file', file); await workspaceApi('/api/maintenance', { method: 'POST', body: form }); await load(); }
  catch (e) { setError((e as Error).message); }
  finally { setBusy(false); }
 }
 async function post() {
  setBusy(true); setError('');
  try { await workspaceApi('/api/maintenance', { method: 'POST', body: JSON.stringify({ id, message }) }); setMessage(''); await load(); }
  catch (e) { setError((e as Error).message); }
  finally { setBusy(false); }
 }
 return <section style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 14 }} aria-label="Request history and attachments">
  <h4 style={{ margin: '0 0 12px', color: T.navy }}>Updates and evidence</h4>
  {loading ? <p role="status">Loading history…</p> : events.length === 0 && <p style={{ fontSize: 13 }}>No updates yet.</p>}
  <ol style={{ margin: '0 0 14px', paddingLeft: 20 }}>
   {events.map(e => <li key={e.id} style={{ fontSize: 13, padding: '4px 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}><time style={{ color: T.inkMuted }}>{new Date(e.created_at).toLocaleString()}</time> · {e.message}</li>)}
  </ol>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
   {files.map(f => <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{f.type === 'receipt' ? 'Receipt' : 'Photo'}: {f.name}</a>)}
  </div>
  {!readOnly && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
   <label style={{ ...btn.ghost, cursor: busy ? 'wait' : 'pointer' }}>Add photo<input aria-label="Attach maintenance photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} style={{ display: 'block', maxWidth: 220, marginTop: 6 }} onChange={e => { void upload(e.target.files?.[0], 'photo'); e.target.value = ''; }} /></label>
   {!tenant && <label style={btn.ghost}>Add receipt<input aria-label="Attach maintenance receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy} style={{ display: 'block', maxWidth: 220, marginTop: 6 }} onChange={e => { void upload(e.target.files?.[0], 'receipt'); e.target.value = ''; }} /></label>}
  </div>}
  {!tenant && !readOnly && <div style={{ marginTop: 12 }}>
   <label style={{ fontSize: 13 }}>Update visible to tenant<textarea style={{ ...input, marginTop: 6 }} maxLength={3000} value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Plumber booked for Tuesday, 10 am–noon." /></label>
   <button style={{ ...btn.primary, marginTop: 8 }} disabled={busy || !message.trim()} onClick={post}>{busy ? 'Saving…' : 'Post update'}</button>
  </div>}
  {!tenant && !readOnly && issue && <RepairCompletion key={issue.workflow_revision} issue={issue} contractors={contractors} files={files} onChange={load}/>}
  {error && <p role="alert" style={{ color: T.coral }}>{error} <button style={btn.ghost} onClick={load}>Retry</button></p>}
 </section>;
}
