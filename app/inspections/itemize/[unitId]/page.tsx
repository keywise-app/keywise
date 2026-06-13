'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { T, btn, card, input, label as labelStyle } from '../../../lib/theme';
import { calculateTotals, daysUntilDeadline, getDeadline, type LineItem } from '../../../../lib/compliance/ca/ab2801-itemization';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ItemizePage({ params }: { params: { unitId: string } }) {
  const unitId = params.unitId;
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [moveOutDate, setMoveOutDate] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [itemizationId, setItemizationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [unitId]);

  async function loadData() {
    setLoading(true);

    // Try to load existing itemization
    const { data: existing } = await supabase
      .from('deposit_itemizations')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      setItemizationId(existing.id);
      setLineItems(existing.line_items ?? []);
      setDepositAmount(existing.deposit_amount ?? 0);
      setMoveOutDate(existing.move_out_date ?? '');
      setTenantEmail(existing.tenant_email ?? '');
    } else {
      // Try to load from AI analysis
      const { data: analysis } = await supabase
        .from('inspection_analyses')
        .select('ai_findings')
        .eq('unit_id', unitId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (analysis?.ai_findings) {
        const damageFindings = (analysis.ai_findings as any[]).filter(
          (f) => f.classification === 'DAMAGE',
        );
        setLineItems(
          damageFindings.map((f, i) => ({
            id: `li_${Date.now()}_${i}`,
            room: f.room,
            description: f.description,
            amount: null,
            note: `AI confidence: ${f.confidence}/5`,
            photoIds: [],
          })),
        );
      }
    }

    setLoading(false);
  }

  function updateLineItem(id: string, field: keyof LineItem, value: any) {
    setLineItems((prev) =>
      prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)),
    );
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        room: '',
        description: '',
        amount: null,
        note: '',
        photoIds: [],
      },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }

  const totals = calculateTotals(lineItems, depositAmount);
  const deadlineDays = moveOutDate ? daysUntilDeadline(moveOutDate) : null;
  const deadline = moveOutDate ? getDeadline(moveOutDate) : null;

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      unit_id: unitId,
      deposit_amount: depositAmount,
      move_out_date: moveOutDate,
      line_items: lineItems,
      total_deducted: totals.totalDeducted,
      balance_to_tenant: totals.balanceToTenant,
      tenant_email: tenantEmail,
    };

    // Find existing inspection to get the ID for the API route
    const { data: inspection } = await supabase
      .from('inspections')
      .select('id')
      .eq('unit_id', unitId)
      .limit(1)
      .single();

    if (!inspection) {
      setError('No inspection found for this unit');
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/inspections/${inspection.id}/itemize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError('Failed to save itemization');
      setSaving(false);
      return;
    }

    const data = await res.json();
    setItemizationId(data.itemization?.id ?? itemizationId);
    setSuccess('Draft saved');
    setSaving(false);
  }

  async function handleSend() {
    if (!tenantEmail) {
      setError('Please enter tenant email address');
      return;
    }
    if (lineItems.some((li) => li.amount === null || li.amount === undefined)) {
      setError('Please enter an amount for every line item before sending');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    // Save first
    await handleSave();

    const { data: inspection } = await supabase
      .from('inspections')
      .select('id')
      .eq('unit_id', unitId)
      .limit(1)
      .single();

    if (!inspection) {
      setError('No inspection found');
      setSending(false);
      return;
    }

    const res = await fetch(`/api/inspections/${inspection.id}/itemize`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' }),
    });

    if (!res.ok) {
      setError('Failed to send itemization');
    } else {
      setSuccess('Itemization sent to tenant');
    }

    setSending(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: T.inkMuted, fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      {/* Nav */}
      <nav style={{ background: T.navyDark, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/inspections" style={{ color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          &larr; Inspections
        </a>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Deposit Itemization</span>
        <div style={{ width: 50 }} />
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 120px' }}>
        {/* Deadline banner */}
        {deadlineDays !== null && deadlineDays <= 14 && (
          <div
            style={{
              background: deadlineDays <= 3 ? T.coralLight : T.amberLight,
              border: `1px solid ${deadlineDays <= 3 ? T.coral : T.amber}44`,
              borderRadius: T.radiusSm,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 700,
              color: deadlineDays <= 3 ? T.coral : T.amberDark,
            }}
          >
            {deadlineDays <= 0
              ? `DEADLINE PASSED -- Itemization was due ${deadline!.toLocaleDateString()}`
              : `${deadlineDays} day${deadlineDays === 1 ? '' : 's'} remaining to return deposit (deadline: ${deadline!.toLocaleDateString()})`}
          </div>
        )}

        {/* Messages */}
        {error && (
          <div style={{ background: T.coralLight, color: T.coral, padding: '10px 14px', borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: T.greenLight, color: T.greenDark, padding: '10px 14px', borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            {success}
          </div>
        )}

        {/* Deposit & dates */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Deposit Amount</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: 9, color: T.inkMuted, fontSize: 13 }}>$</span>
                <input
                  type="number"
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  placeholder="0.00"
                  style={{ ...input, paddingLeft: 22 }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Move-Out Date</label>
              <input
                type="date"
                value={moveOutDate}
                onChange={(e) => setMoveOutDate(e.target.value)}
                style={input}
              />
            </div>
            <div>
              <label style={labelStyle}>Tenant Email</label>
              <input
                type="email"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
                placeholder="tenant@email.com"
                style={input}
              />
            </div>
          </div>

          {deadline && (
            <div style={{ marginTop: 10, fontSize: 12, color: T.inkMuted }}>
              21-day deadline: {deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Totals summary */}
        <div
          style={{
            ...card,
            marginBottom: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 4 }}>
              Deposit
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.navy }}>
              ${depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 4 }}>
              Total Deducted
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: totals.totalDeducted > 0 ? T.coral : T.ink }}>
              ${totals.totalDeducted.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 4 }}>
              Balance to Tenant
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.greenDark }}>
              ${totals.balanceToTenant.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.navy, margin: 0 }}>
              Deduction Line Items
            </h3>
            <button style={{ ...btn.teal, fontSize: 12, padding: '6px 12px' }} onClick={addLineItem}>
              + Add Item
            </button>
          </div>

          {lineItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: T.inkMuted, fontSize: 13 }}>
              No line items. Add deductions or run AI analysis first.
            </div>
          )}

          {lineItems.map((li, idx) => (
            <div
              key={li.id}
              style={{
                background: T.bg,
                borderRadius: T.radiusSm,
                padding: 14,
                marginBottom: 8,
                position: 'relative',
              }}
            >
              <button
                onClick={() => removeLineItem(li.id)}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'none',
                  border: 'none',
                  color: T.coral,
                  fontSize: 16,
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
                title="Remove line item"
              >
                &times;
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: 10, marginBottom: 8 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 10 }}>Room</label>
                  <input
                    value={li.room}
                    onChange={(e) => updateLineItem(li.id, 'room', e.target.value)}
                    placeholder="Room"
                    style={{ ...input, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 10 }}>Description</label>
                  <input
                    value={li.description}
                    onChange={(e) => updateLineItem(li.id, 'description', e.target.value)}
                    placeholder="Description of damage/repair"
                    style={{ ...input, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 10 }}>Amount ($)</label>
                  <input
                    type="number"
                    value={li.amount ?? ''}
                    onChange={(e) => updateLineItem(li.id, 'amount', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0.00"
                    style={{ ...input, fontSize: 12 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Notes</label>
                <input
                  value={li.note}
                  onChange={(e) => updateLineItem(li.id, 'note', e.target.value)}
                  placeholder="Additional notes (hours, rate, vendor, etc.)"
                  style={{ ...input, fontSize: 12 }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legal disclaimer */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusSm,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 11,
            color: T.inkMuted,
            lineHeight: 1.6,
          }}
        >
          <strong>Legal Notice:</strong> This itemization tool assists with California Civil Code
          Section 1950.5 compliance. It does not constitute legal advice. Deductions must be limited
          to damage beyond ordinary wear and tear, and repair costs must be reasonable and necessary
          to restore the unit to its move-in condition. The landlord bears the burden of proof for
          all deductions. For deductions over $125, receipts or invoices are required. Consult an
          attorney for specific legal guidance.
        </div>
      </div>

      {/* Sticky bottom actions */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: T.surface,
          borderTop: `1px solid ${T.border}`,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          zIndex: 50,
        }}
      >
        <button
          style={{ ...btn.ghost, flex: 1, maxWidth: 200, justifyContent: 'center' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          style={{ ...btn.primary, flex: 1, maxWidth: 280, justifyContent: 'center' }}
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? 'Sending...' : 'Generate PDF & Send to Tenant'}
        </button>
      </div>
    </div>
  );
}
