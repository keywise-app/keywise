'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { callClaude } from '../lib/claude';

type Expense = {
  id: string;
  property: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  deductible: boolean;
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

const CATEGORIES = ['Repairs', 'Maintenance', 'Insurance', 'Taxes', 'Utilities', 'Legal', 'Mortgage', 'Management', 'Other'];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    property: '', category: 'Repairs', amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '', vendor: '', deductible: true,
  });

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data) setExpenses(data);
    setLoading(false);
  };

  const extractReceiptData = async (file: File) => {
    setExtracting(true);
    setExtractError('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, fileType: file.type }),
      });

      const data = await res.json();

      if (data.error) {
        setExtractError(data.error);
      } else {
        setForm(prev => ({
          ...prev,
          description: data.description || '',
          amount: data.amount || '',
          date: data.date || prev.date,
          category: data.category || 'Repairs',
          vendor: data.vendor || '',
          deductible: data.deductible !== undefined ? data.deductible : true,
        }));
      }
    } catch (err) {
      setExtractError('Could not read file. Please fill in manually.');
    }
    setExtracting(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setShowAdd(true);
      extractReceiptData(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const addExpense = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      property: form.property,
      category: form.category,
      amount: +form.amount,
      date: form.date,
      description: form.vendor ? form.description + (form.vendor ? ' — ' + form.vendor : '') : form.description,
      deductible: form.deductible,
    });
    if (error) {
      alert('Error saving: ' + error.message);
    } else {
      await fetchExpenses();
      setShowAdd(false);
      setForm({ property: '', category: 'Repairs', amount: '', date: new Date().toISOString().split('T')[0], description: '', vendor: '', deductible: true });
      setExtractError('');
    }
    setSaving(false);
  };

  const removeExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const getAiSummary = async () => {
    setAiLoading(true);
    setAiSummary('');
    const rows = expenses.map(e =>
      e.date + ' | ' + e.property + ' | ' + e.category + ' | ' + e.description + ' | $' + e.amount + ' | ' + (e.deductible ? 'deductible' : 'not deductible')
    ).join('\n');
    const result = await callClaude('Analyze these rental property expenses for a small landlord:\n\n' + rows + '\n\nProvide: 1) Total deductible vs non-deductible breakdown with amounts, 2) Biggest cost categories, 3) Any unusual or high expenses to flag, 4) 2-3 practical tips to reduce costs or maximize deductions. Be concise and actionable.');
    setAiSummary(result);
    setAiLoading(false);
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const deductible = expenses.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0);
  const nonDeductible = total - deductible;
  const filtered = filterCategory === 'all' ? expenses : expenses.filter(e => e.category === filterCategory);
  const usedCategories = [...new Set(expenses.map(e => e.category))];

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Expenses', value: '$' + total.toLocaleString(), color: '#1C1C1C' },
          { label: 'Tax Deductible', value: '$' + deductible.toLocaleString(), color: '#2D6A4F' },
          { label: 'Non-Deductible', value: '$' + nonDeductible.toLocaleString(), color: '#C0392B' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#8C8070', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => { setShowAdd(true); }}
        style={{
          border: '2px dashed ' + (dragOver ? '#1A472A' : '#E8E3D8'),
          borderRadius: 12, padding: '20px', textAlign: 'center',
          cursor: 'pointer', marginBottom: 20,
          background: dragOver ? '#D8EDDF' : 'white',
          transition: 'all 0.15s',
        }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1A472A' }}>Drop a receipt or invoice here</div>
        <div style={{ fontSize: 12, color: '#8C8070', marginTop: 4 }}>Or click to add expense manually · PDF, image, or email screenshot</div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>✦ AI Tax & Expense Analysis</div>
          <div style={{ background: '#D8EDDF', border: '1px solid #2D6A4F33', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{aiSummary}</div>
          <button onClick={() => setAiSummary('')}
            style={{ marginTop: 10, background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all', ...usedCategories].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: filterCategory === cat ? '#1A472A' : '#F7F5F0',
                color: filterCategory === cat ? 'white' : '#4A4A4A',
                border: '1px solid ' + (filterCategory === cat ? '#1A472A' : '#E8E3D8'),
                textTransform: 'capitalize',
              }}>
              {cat}
            </button>
          ))}
        </div>
        <button onClick={getAiSummary} disabled={aiLoading || expenses.length === 0}
          style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {aiLoading ? 'Analyzing…' : '✦ AI Tax Summary'}
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#8C8070' }}>Loading expenses…</div>}

        {!loading && expenses.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No expenses yet</div>
            <div style={{ color: '#8C8070', fontSize: 13 }}>Drop a receipt above or click to add your first expense.</div>
          </div>
        )}

        {filtered.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Property', 'Category', 'Description', 'Deductible', 'Amount', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, color: '#8C8070', fontWeight: 700, padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #E8E3D8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ padding: '12px', fontSize: 13, borderBottom: '1px solid #F0EDE8' }}>{e.date}</td>
                  <td style={{ padding: '12px', fontSize: 13, borderBottom: '1px solid #F0EDE8', color: '#8C8070' }}>{e.property || '—'}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #F0EDE8' }}>
                    <span style={{ background: '#EEF2FF', color: '#3730A3', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{e.category}</span>
                  </td>
                  <td style={{ padding: '12px', fontSize: 13, borderBottom: '1px solid #F0EDE8' }}>{e.description}</td>
                  <td style={{ padding: '12px', fontSize: 13, borderBottom: '1px solid #F0EDE8' }}>
                    {e.deductible
                      ? <span style={{ color: '#2D6A4F', fontWeight: 600 }}>✓ Yes</span>
                      : <span style={{ color: '#8C8070' }}>No</span>
                    }
                  </td>
                  <td style={{ padding: '12px', fontSize: 13, borderBottom: '1px solid #F0EDE8', fontWeight: 700, color: '#C0392B' }}>${e.amount.toLocaleString()}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #F0EDE8' }}>
                    <button onClick={() => removeExpense(e.id)}
                      style={{ background: '#FDECEA', color: '#C0392B', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setShowAdd(false); setExtractError(''); }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 500, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Add Expense</div>
            <div style={{ fontSize: 13, color: '#8C8070', marginBottom: 20 }}>Upload a receipt and we'll fill in the details automatically.</div>

            {/* Upload zone inside modal */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) extractReceiptData(file); }}
              onDragOver={e => e.preventDefault()}
              style={{
                border: '2px dashed #E8E3D8', borderRadius: 12, padding: '16px',
                textAlign: 'center', cursor: 'pointer', marginBottom: 20,
                background: extracting ? '#F7F5F0' : 'white',
              }}>
              <input ref={fileInputRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                onChange={e => { const file = e.target.files?.[0]; if (file) extractReceiptData(file); }} />
              {extracting
                ? <div style={{ color: '#1A472A', fontSize: 13, fontWeight: 600 }}>✦ Reading receipt… just a moment</div>
                : <>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1A472A' }}>Upload Receipt or Invoice</div>
                    <div style={{ fontSize: 12, color: '#8C8070', marginTop: 3 }}>Click or drag · PDF or image · AI auto-fills below</div>
                  </>
              }
            </div>

            {extractError && (
              <div style={{ background: '#FDECEA', border: '1px solid #C0392B33', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C0392B', marginBottom: 16 }}>
                {extractError}
              </div>
            )}

            <div style={{ borderTop: '1px solid #E8E3D8', paddingTop: 16 }}>
              <div style={{ fontSize: 11, color: '#8C8070', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Review & Edit Details</div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Property</label>
                <input style={inputStyle} value={form.property} placeholder="e.g. 42 Maple St, Unit 1"
                  onChange={e => setForm({ ...form, property: e.target.value })} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} value={form.description} placeholder="What was this expense for?"
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              {form.vendor ? (
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Vendor</label>
                  <input style={inputStyle} value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Amount ($)</label>
                  <input style={inputStyle} type="number" value={form.amount} placeholder="0"
                    onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Date</label>
                <input style={inputStyle} type="date" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Tax Deductible?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[true, false].map(val => (
                    <button key={String(val)} onClick={() => setForm({ ...form, deductible: val })}
                      style={{
                        flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: form.deductible === val ? (val ? '#D8EDDF' : '#FDECEA') : '#F7F5F0',
                        color: form.deductible === val ? (val ? '#2D6A4F' : '#C0392B') : '#8C8070',
                        border: '1px solid ' + (form.deductible === val ? (val ? '#2D6A4F' : '#C0392B') : '#E8E3D8'),
                      }}>
                      {val ? '✓ Yes — Deductible' : '✗ No — Not Deductible'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={addExpense} disabled={saving}
                  style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? 'Saving…' : 'Save Expense'}
                </button>
                <button onClick={() => { setShowAdd(false); setExtractError(''); }}
                  style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}