'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type Issue = {
  id: string;
  property: string;
  issue: string;
  category: string;
  priority: string;
  status: string;
  notes: string;
  vendor: string;
  cost: number;
  reported_date: string;
  resolved_date: string;
};

const inputStyle = {
  width: '100%', background: '#F7F5F0', border: '1px solid #E8E3D8',
  borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  fontSize: 11, color: '#8C8070', fontWeight: 700,
  textTransform: 'uppercase' as const, letterSpacing: '0.4px',
  display: 'block', marginBottom: 5,
};

const CATEGORIES = ['Plumbing', 'HVAC', 'Electrical', 'Appliances', 'Structural', 'Pest', 'Landscaping', 'General'];
const STATUS_ORDER = ['open', 'in-progress', 'resolved'];
const priorityColor = { low: '#2D6A4F', medium: '#D4701A', high: '#C0392B' };
const priorityBg = { low: '#D8EDDF', medium: '#FEF0E4', high: '#FDECEA' };
const statusColor = { open: '#C0392B', 'in-progress': '#D4701A', resolved: '#2D6A4F' };
const statusBg = { open: '#FDECEA', 'in-progress': '#FEF0E4', resolved: '#D8EDDF' };

export default function Maintenance() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [drafts, setDrafts] = useState<{ [key: string]: string }>({});
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [aiAssessments, setAiAssessments] = useState<{ [key: string]: string }>({});
  const [assessingId, setAssessingId] = useState<string | null>(null);
  const [properties, setProperties] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<'freetext' | 'form'>('freetext');
  const [freeText, setFreeText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [aiAssessmentNew, setAiAssessmentNew] = useState('');
  const [assessing, setAssessing] = useState(false);

  const emptyForm = {
    property: '', issue: '', category: 'General', priority: 'medium',
    status: 'open', notes: '', vendor: '', cost: '',
    reported_date: new Date().toISOString().split('T')[0], resolved_date: '',
  };
  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => { fetchIssues(); fetchProperties(); }, []);

  const fetchIssues = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('maintenance').select('*').order('reported_date', { ascending: false });
    if (!error && data) setIssues(data);
    setLoading(false);
  };

  const fetchProperties = async () => {
    const { data } = await supabase.from('properties').select('address');
    if (data) setProperties(data.map(p => p.address));
  };

  // Parse free text into structured form using Claude
  const parseFreeText = async () => {
    if (!freeText.trim()) return;
    setParsing(true);
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Extract maintenance issue details from this text and return ONLY valid JSON with no markdown:\n\n"' + freeText + '"\n\nReturn: {"issue":"brief issue title","category":"one of Plumbing/HVAC/Electrical/Appliances/Structural/Pest/Landscaping/General","priority":"low/medium/high","notes":"any additional details","property":"property address if mentioned or empty string","vendor":"contractor name if mentioned or empty string","cost":"estimated cost as number if mentioned or 0"}',
      }),
    });
    const data = await res.json();
    try {
      const cleaned = data.result.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setForm({
        ...emptyForm,
        issue: parsed.issue || freeText.slice(0, 100),
        category: parsed.category || 'General',
        priority: parsed.priority || 'medium',
        notes: parsed.notes || freeText,
        property: parsed.property || '',
        vendor: parsed.vendor || '',
        cost: parsed.cost || '',
      });
      setInputMode('form');
    } catch {
      setForm({ ...emptyForm, issue: freeText.slice(0, 100), notes: freeText });
      setInputMode('form');
    }
    setParsing(false);
  };

  // AI assess new issue from form
  const assessNewIssue = async () => {
    if (!form.issue) return;
    setAssessing(true);
    setAiAssessmentNew('');
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'You are a property maintenance expert. Assess this maintenance issue:\n\nIssue: ' + form.issue + '\nCategory: ' + form.category + '\nProperty: ' + (form.property || 'not specified') + '\nNotes: ' + (form.notes || 'none') + '\n\nProvide:\n1. Priority level (Low/Medium/High/Emergency) with reasoning\n2. Estimated cost range for this type of repair\n3. Repair vs Replace recommendation if applicable\n4. Recommended action steps\n5. How urgent is this — can it wait a week, or needs immediate attention?\n\nBe specific and practical.',
      }),
    });
    const data = await res.json();
    setAiAssessmentNew(data.result);
    setAssessing(false);
  };

  const saveIssue = async () => {
    if (!form.issue) { alert('Please describe the issue.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      user_id: user.id,
      property: form.property,
      issue: form.issue,
      category: form.category,
      priority: form.priority,
      status: form.status,
      notes: form.notes,
      vendor: form.vendor,
      cost: +form.cost || 0,
      reported_date: form.reported_date || null,
      resolved_date: form.resolved_date || null,
    };

    let error;
    if (editingIssue) {
      ({ error } = await supabase.from('maintenance').update(payload).eq('id', editingIssue.id));
    } else {
      ({ error } = await supabase.from('maintenance').insert(payload));
    }

    if (error) {
      alert('Error saving: ' + error.message);
    } else {
      await fetchIssues();
      setShowAdd(false);
      setEditingIssue(null);
      setForm(emptyForm);
      setFreeText('');
      setAiAssessmentNew('');
      setInputMode('freetext');
    }
    setSaving(false);
  };

  const cycleStatus = async (issue: Issue) => {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(issue.status) + 1) % STATUS_ORDER.length];
    const update: any = { status: next };
    if (next === 'resolved') update.resolved_date = new Date().toISOString().split('T')[0];
    await supabase.from('maintenance').update(update).eq('id', issue.id);
    setIssues(issues.map(i => i.id === issue.id ? { ...i, ...update } : i));
  };

  const removeIssue = async (id: string) => {
    if (!confirm('Remove this issue?')) return;
    await supabase.from('maintenance').delete().eq('id', id);
    setIssues(issues.filter(i => i.id !== id));
  };

  const openEdit = (issue: Issue) => {
    setEditingIssue(issue);
    setInputMode('form');
    setForm({
      property: issue.property || '', issue: issue.issue || '',
      category: issue.category || 'General', priority: issue.priority || 'medium',
      status: issue.status || 'open', notes: issue.notes || '',
      vendor: issue.vendor || '', cost: issue.cost || '',
      reported_date: issue.reported_date || '',
      resolved_date: issue.resolved_date || '',
    });
    setShowAdd(true);
  };

  const draftContractor = async (issue: Issue) => {
    setDraftingId(issue.id);
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Draft a professional contractor outreach message:\n\nProperty: ' + issue.property + '\nIssue: ' + issue.issue + '\nCategory: ' + issue.category + '\nPriority: ' + issue.priority + '\nNotes: ' + (issue.notes || 'none') + '\n\nAsk for availability, describe the issue clearly, mention urgency, and request an estimate. Under 150 words.',
      }),
    });
    const data = await res.json();
    setDrafts(prev => ({ ...prev, [issue.id]: data.result }));
    setDraftingId(null);
  };

  const assessIssue = async (issue: Issue) => {
    setAssessingId(issue.id);
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'You are a property maintenance expert. Assess this issue:\n\nIssue: ' + issue.issue + '\nCategory: ' + issue.category + '\nPriority: ' + issue.priority + '\nProperty: ' + (issue.property || 'not specified') + '\nNotes: ' + (issue.notes || 'none') + '\nVendor: ' + (issue.vendor || 'not assigned') + '\nCost so far: $' + (issue.cost || 0) + '\n\nProvide:\n1. Assessment of urgency and risk if left unaddressed\n2. Estimated total cost range\n3. Repair vs Replace recommendation\n4. Recommended next steps\n5. Any related preventive maintenance to consider\n\nBe specific and practical.',
      }),
    });
    const data = await res.json();
    setAiAssessments(prev => ({ ...prev, [issue.id]: data.result }));
    setAssessingId(null);
  };

  const openCount = issues.filter(i => i.status === 'open').length;
  const inProgressCount = issues.filter(i => i.status === 'in-progress').length;
  const highPriorityCount = issues.filter(i => i.priority === 'high' && i.status !== 'resolved').length;
  const totalCost = issues.filter(i => i.cost > 0).reduce((s, i) => s + i.cost, 0);
  const filtered = filter === 'all' ? issues : issues.filter(i => i.status === filter);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Open Issues', value: openCount, color: '#C0392B' },
          { label: 'In Progress', value: inProgressCount, color: '#D4701A' },
          { label: 'High Priority', value: highPriorityCount, color: '#C0392B' },
          { label: 'Total Costs', value: '$' + totalCost.toLocaleString(), color: '#1C1C1C' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#8C8070', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'open', 'in-progress', 'resolved'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                background: filter === f ? '#1A472A' : '#F7F5F0',
                color: filter === f ? 'white' : '#4A4A4A',
                border: '1px solid ' + (filter === f ? '#1A472A' : '#E8E3D8'),
              }}>
              {f === 'all' ? 'All (' + issues.length + ')' : f + ' (' + issues.filter(i => i.status === f).length + ')'}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowAdd(true); setEditingIssue(null); setForm(emptyForm); setFreeText(''); setAiAssessmentNew(''); setInputMode('freetext'); }}
          style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Log Issue
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#8C8070' }}>Loading issues…</div>}

      {!loading && issues.length === 0 && (
        <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No maintenance issues</div>
          <div style={{ color: '#8C8070', fontSize: 13, marginBottom: 20 }}>Log repair requests and track them from report to resolution.</div>
          <button onClick={() => setShowAdd(true)}
            style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Log First Issue
          </button>
        </div>
      )}

      {filtered.map(issue => (
        <div key={issue.id} style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{issue.issue}</div>
                <span style={{ background: priorityBg[issue.priority as keyof typeof priorityBg] || '#F7F5F0', color: priorityColor[issue.priority as keyof typeof priorityColor] || '#4A4A4A', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{issue.priority}</span>
                <span style={{ background: statusBg[issue.status as keyof typeof statusBg] || '#F7F5F0', color: statusColor[issue.status as keyof typeof statusColor] || '#4A4A4A', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{issue.status}</span>
                <span style={{ background: '#F7F5F0', color: '#4A4A4A', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{issue.category}</span>
              </div>
              <div style={{ fontSize: 13, color: '#8C8070', marginBottom: 6 }}>
                {issue.property} · Reported {issue.reported_date}
                {issue.resolved_date && ' · Resolved ' + issue.resolved_date}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {issue.vendor && <div style={{ fontSize: 12, color: '#4A4A4A' }}>🔧 {issue.vendor}</div>}
                {issue.cost > 0 && <div style={{ fontSize: 12, color: '#C0392B', fontWeight: 600 }}>💰 ${issue.cost.toLocaleString()}</div>}
              </div>
              {issue.notes && <div style={{ fontSize: 12, color: '#8C8070', marginTop: 6, fontStyle: 'italic' }}>{issue.notes}</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginLeft: 16 }}>
              {issue.status !== 'resolved' && (
                <button onClick={() => cycleStatus(issue)}
                  style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  → {STATUS_ORDER[STATUS_ORDER.indexOf(issue.status) + 1] === 'in-progress' ? 'In Progress' : 'Resolved'}
                </button>
              )}
              <button onClick={() => assessIssue(issue)} disabled={assessingId === issue.id}
                style={{ background: '#D8EDDF', color: '#1A472A', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {assessingId === issue.id ? 'Assessing…' : '✦ AI Assess'}
              </button>
              <button onClick={() => draftContractor(issue)} disabled={draftingId === issue.id}
                style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {draftingId === issue.id ? 'Drafting…' : '✦ Contractor'}
              </button>
              <button onClick={() => openEdit(issue)}
                style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                ✏️ Edit
              </button>
              <button onClick={() => removeIssue(issue.id)}
                style={{ background: '#FDECEA', color: '#C0392B', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Remove
              </button>
            </div>
          </div>

          {aiAssessments[issue.id] && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A472A', marginBottom: 8 }}>✦ AI Assessment</div>
              <div style={{ background: '#D8EDDF', border: '1px solid #2D6A4F33', borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{aiAssessments[issue.id]}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => navigator.clipboard.writeText(aiAssessments[issue.id])}
                  style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📋 Copy</button>
                <button onClick={() => setAiAssessments(prev => { const n = { ...prev }; delete n[issue.id]; return n; })}
                  style={{ background: '#FDECEA', color: '#C0392B', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Dismiss</button>
              </div>
            </div>
          )}

          {drafts[issue.id] && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A472A', marginBottom: 8 }}>✦ Contractor Message</div>
              <div style={{ background: '#F7F5F0', borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{drafts[issue.id]}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => navigator.clipboard.writeText(drafts[issue.id])}
                  style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📋 Copy</button>
                <button onClick={() => window.open('mailto:?subject=' + encodeURIComponent('Maintenance — ' + issue.property) + '&body=' + encodeURIComponent(drafts[issue.id]))}
                  style={{ background: '#D8EDDF', color: '#2D6A4F', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✉️ Email</button>
                <button onClick={() => setDrafts(prev => { const n = { ...prev }; delete n[issue.id]; return n; })}
                  style={{ background: '#FDECEA', color: '#C0392B', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Dismiss</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setShowAdd(false); setEditingIssue(null); setForm(emptyForm); setFreeText(''); setAiAssessmentNew(''); setInputMode('freetext'); }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{editingIssue ? 'Edit Issue' : 'Log Maintenance Issue'}</div>
            <div style={{ fontSize: 13, color: '#8C8070', marginBottom: 20 }}>Describe the issue and let AI assess priority and cost.</div>

            {!editingIssue && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[{ id: 'freetext', label: '✍️ Just Describe It' }, { id: 'form', label: '📋 Use Form' }].map(m => (
                  <button key={m.id} onClick={() => setInputMode(m.id as any)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: inputMode === m.id ? '#1A472A' : '#F7F5F0',
                      color: inputMode === m.id ? 'white' : '#4A4A4A',
                      border: '1px solid ' + (inputMode === m.id ? '#1A472A' : '#E8E3D8'),
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {inputMode === 'freetext' && !editingIssue && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Describe the issue in your own words</label>
                  <textarea value={freeText} onChange={e => setFreeText(e.target.value)}
                    placeholder="e.g. The kitchen faucet at my Maple St unit has been dripping for a week, getting worse. Tenant says water is pooling under the sink too. Might be the P-trap. Need a plumber ASAP."
                    style={{ ...inputStyle, minHeight: 120, resize: 'vertical', fontFamily: 'sans-serif', fontSize: 14 }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <button onClick={parseFreeText} disabled={parsing || !freeText.trim()}
                    style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }}>
                    {parsing ? '✦ Parsing…' : '✦ Parse & Fill Form'}
                  </button>
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#8C8070' }}>Claude will extract the details and fill the form automatically</div>
              </div>
            )}

            {inputMode === 'form' && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Property</label>
                  {properties.length > 0 ? (
                    <select style={inputStyle} value={form.property} onChange={e => setForm({ ...form, property: e.target.value })}>
                      <option value="">Select property…</option>
                      {properties.map(p => <option key={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input style={inputStyle} value={form.property} placeholder="e.g. 42 Maple St, Unit 1"
                      onChange={e => setForm({ ...form, property: e.target.value })} />
                  )}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Issue Description *</label>
                  <textarea value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })}
                    placeholder="e.g. Leaky faucet in master bathroom"
                    style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'sans-serif' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Priority</label>
                    <select style={inputStyle} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Reported Date</label>
                    <input style={inputStyle} type="date" value={form.reported_date}
                      onChange={e => setForm({ ...form, reported_date: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Resolved Date</label>
                    <input style={inputStyle} type="date" value={form.resolved_date}
                      onChange={e => setForm({ ...form, resolved_date: e.target.value })} />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Vendor / Contractor</label>
                  <input style={inputStyle} value={form.vendor} placeholder="e.g. ABC Plumbing"
                    onChange={e => setForm({ ...form, vendor: e.target.value })} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Cost ($)</label>
                  <input style={inputStyle} type="number" value={form.cost} placeholder="0"
                    onChange={e => setForm({ ...form, cost: e.target.value })} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional details, parts needed, access instructions…"
                    style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'sans-serif' }} />
                </div>

                {/* AI Assess button */}
                <button onClick={assessNewIssue} disabled={assessing || !form.issue}
                  style={{ width: '100%', background: '#D8EDDF', color: '#1A472A', border: '1px solid #2D6A4F33', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
                  {assessing ? '✦ Assessing…' : '✦ AI Priority Assessment + Cost Estimate'}
                </button>

                {aiAssessmentNew && (
                  <div style={{ background: '#D8EDDF', border: '1px solid #2D6A4F33', borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: 14 }}>
                    {aiAssessmentNew}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={saveIssue} disabled={saving}
                    style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {saving ? 'Saving…' : editingIssue ? 'Save Changes' : 'Log Issue'}
                  </button>
                  <button onClick={() => { setShowAdd(false); setEditingIssue(null); setForm(emptyForm); setFreeText(''); setAiAssessmentNew(''); setInputMode('freetext'); }}
                    style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}