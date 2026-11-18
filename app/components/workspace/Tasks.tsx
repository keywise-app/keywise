'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { localDate } from '@/lib/workspace/records';
import { T, card, btn, input } from '../../lib/theme';
export default function Tasks() {
 const [tasks, setTasks] = useState<any[]>([]);
 const [units, setUnits] = useState<any[]>([]);
 const [title, setTitle] = useState('');
 const [due, setDue] = useState(localDate());
 const [propertyId, setPropertyId] = useState('');
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 const [loading, setLoading] = useState(true);
 const [showCompleted, setShowCompleted] = useState(false);
 async function load() {
  try {
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error('Please sign in.');
   const [t, p] = await Promise.all([supabase.from('workspace_tasks').select('*').eq('user_id',user.id).order('due_date'), supabase.from('properties').select('id,address').eq('user_id',user.id)]);
   if (t.error || p.error) throw t.error || p.error;
   setTasks(t.data || []); setUnits(p.data || []); setError('');
  } catch { setError('Unable to load tasks. Please retry.'); }
  finally { setLoading(false); }
 }
 useEffect(() => { void load(); }, []);
 async function add(e: React.FormEvent) {
  e.preventDefault(); setBusy(true); setError('');
  try {
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error('Please sign in.');
   const { error } = await supabase.from('workspace_tasks').insert({ user_id: user.id, title: title.trim(), due_date: due, property_id: propertyId || null });
   if (error) throw error;
   setTitle(''); await load();
  } catch { setError('Task was not saved. Please retry.'); }
  finally { setBusy(false); }
 }
 async function toggle(task: any) {
  setBusy(true);
  const { error } = await supabase.from('workspace_tasks').update({ completed_at: task.completed_at ? null : new Date().toISOString() }).eq('id',task.id);
  if (error) setError('Task was not updated. Please retry.'); else await load();
  setBusy(false);
 }
 const today = localDate();
 const open = tasks.filter(t => !t.completed_at);
 return <section style={card}>
  <h3 style={{ marginTop: 0, color: T.navy }}>Tasks <span style={{ fontSize: 13, color: T.inkMuted }}>{open.filter(t => t.due_date < today).length} overdue · {open.length} open</span></h3>
  <form onSubmit={add} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
   <input aria-label="Task title" style={{ ...input, flex: '1 1 180px' }} placeholder="Add a task" required maxLength={300} value={title} onChange={e => setTitle(e.target.value)} />
   <input aria-label="Task due date" style={{ ...input, width: 'auto' }} type="date" required value={due} onChange={e => setDue(e.target.value)} />
   <select aria-label="Task property" style={{ ...input, flex: '1 1 160px' }} value={propertyId} onChange={e => setPropertyId(e.target.value)}><option value="">Portfolio task</option>{units.map(u => <option key={u.id} value={u.id}>{u.address}</option>)}</select>
   <button style={btn.primary} disabled={busy}>Add task</button>
  </form>
  {error && <p role="alert" style={{ color: T.coral }}>{error} <button style={btn.ghost} onClick={load}>Retry</button></p>}
  {loading && <p role="status">Loading tasks…</p>}
  {!loading && !error && open.length === 0 && <p style={{ fontSize: 13 }}>No open tasks.</p>}
  {tasks.filter(t => showCompleted || !t.completed_at).map(t => <label key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderTop: `1px solid ${T.border}`, fontSize: 13 }}>
   <input type="checkbox" checked={!!t.completed_at} disabled={busy} onChange={() => toggle(t)} />
   <span style={{ flex: 1, textDecoration: t.completed_at ? 'line-through' : undefined }}>{t.title}<small style={{ display: 'block', color: T.inkMuted }}>{units.find(u => u.id === t.property_id)?.address}</small></span>
   <span style={{ color: !t.completed_at && t.due_date < today ? T.coral : T.inkMuted }}>{t.due_date}{!t.completed_at && t.due_date < today ? ' · Overdue' : ''}</span>
  </label>)}
  <button style={btn.ghost} onClick={() => setShowCompleted(!showCompleted)}>{showCompleted ? 'Hide' : 'Show'} completed tasks</button>
 </section>;
}
