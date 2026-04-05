'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { callClaude } from '../lib/claude';
import { T, input, label, btn } from '../lib/theme';
import AddTenantWizard from './AddTenantWizard';
import Inspections from './Inspections';

export default function Tenants({ autoOpenWizard, onWizardOpen }: { autoOpenWizard?: boolean; onWizardOpen?: () => void } = {}) {
  const [showWizard, setShowWizard] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [tab, setTab] = useState<'overview' | 'payments' | 'communications' | 'transition' | 'inspections' | 'documents'>('overview');
  const [profile, setProfile] = useState<{ full_name: string; email: string; phone: string; company: string } | null>(null);
  const [transitionMsgs, setTransitionMsgs] = useState<Record<string, { text: string; loading: boolean; copied: boolean; smsStatus: string; sending: boolean }>>({});
  const [drafting, setDrafting] = useState(false);
  const [msgType, setMsgType] = useState('late-rent');
  const [context, setContext] = useState('');
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteMagicLink, setInviteMagicLink] = useState<string | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [inviteSmsSent, setInviteSmsSent] = useState<string | null>(null);
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [tenantDocs, setTenantDocs] = useState<any[]>([]);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docForm, setDocForm] = useState({ name: '', type: 'other', expiry_date: '' });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);
  const [prForm, setPrForm] = useState({ type: 'Monthly Rent', amount: '', description: '', due_date: '', recurring: false, notify_email: true, notify_sms: true });
  const [prSending, setPrSending] = useState(false);
  const [prSuccess, setPrSuccess] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const [prLinkCopied, setPrLinkCopied] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState('Zelle');
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [tenantReceiptSent, setTenantReceiptSent] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpenWizard) { setShowWizard(true); onWizardOpen?.(); }
  }, [autoOpenWizard]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [lRes, pRes, profRes] = await Promise.all([
      supabase.from('leases').select('*').order('tenant_name'),
      supabase.from('payments').select('*').order('due_date', { ascending: false }),
      user ? supabase.from('profiles').select('full_name, email, phone, company').eq('id', user.id).single() : Promise.resolve({ data: null }),
    ]);
    if (lRes.data) {
      setLeases(lRes.data);
      if (lRes.data.length > 0 && !selected) setSelected(lRes.data[0]);
    }
    if (pRes.data) setPayments(pRes.data);
    if (profRes.data) setProfile(profRes.data);
    // Fetch documents for all tenants
    const { data: allDocs } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (allDocs) setTenantDocs(allDocs);
    setLoading(false);
  };

  const openEdit = () => {
    if (!selected) { console.error('[Tenants] openEdit: no tenant selected'); return; }
    setEditForm({
      tenant_name: selected.tenant_name || '',
      property: selected.property || '',
      email: selected.email || '',
      phone: selected.phone || '',
      rent: selected.rent || '',
      deposit: selected.deposit || '',
      start_date: selected.start_date || '',
      end_date: selected.end_date || '',
      status: selected.status || 'active',
      payment_day: selected.payment_day || 1,
      payment_frequency: selected.payment_frequency || 'monthly',
      late_fee_percent: selected.late_fee_percent || '',
      late_fee_days: selected.late_fee_days || '',
      late_fee_type: selected.late_fee_type || 'percent',
      lease_terms_raw: selected.lease_terms_raw || '',
    });
    setEditing(true);
  };

  const saveLease = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from('leases').update({
      tenant_name: editForm.tenant_name,
      property: editForm.property,
      email: editForm.email,
      phone: editForm.phone,
      rent: +editForm.rent || 0,
      deposit: +editForm.deposit || 0,
      start_date: editForm.start_date || null,
      end_date: editForm.end_date || null,
      status: editForm.status,
      payment_day: +editForm.payment_day || 1,
      payment_frequency: editForm.payment_frequency || 'monthly',
      late_fee_percent: +editForm.late_fee_percent || 0,
      late_fee_days: +editForm.late_fee_days || 3,
      late_fee_type: editForm.late_fee_type || 'percent',
      lease_terms_raw: editForm.lease_terms_raw || '',
    }).eq('id', selected.id);
    if (error) { alert('Error: ' + error.message); }
    else {
      const updated = { ...selected, ...editForm };
      setSelected(updated);
      setLeases(leases.map(l => l.id === selected.id ? updated : l));
      setEditing(false);
    }
    setSaving(false);
  };

  const removeTenant = async () => {
    if (!selected) return;
    if (!confirm('Remove ' + selected.tenant_name + '? This will delete all their records.')) return;

    // 1. Get all inspection IDs for this lease
    const { data: inspectionRows } = await supabase.from('inspections').select('id').eq('lease_id', selected.id);
    const inspectionIds = inspectionRows?.map(i => i.id) || [];

    // 2. Delete signing tokens for inspections
    if (inspectionIds.length > 0) {
      await supabase.from('signing_tokens').delete().in('inspection_id', inspectionIds);
    }

    // 3. Delete signing tokens for documents/lease
    await supabase.from('signing_tokens').delete().eq('lease_id', selected.id);

    // 4. Delete inspection photos
    if (inspectionIds.length > 0) {
      await supabase.from('inspection_photos').delete().in('inspection_id', inspectionIds);
    }

    // 5. Delete inspections
    await supabase.from('inspections').delete().eq('lease_id', selected.id);

    // 6. Delete payments
    await supabase.from('payments').delete().eq('lease_id', selected.id);

    // 7. Delete documents
    await supabase.from('documents').delete().eq('lease_id', selected.id);

    // 8. Delete lease
    const { error } = await supabase.from('leases').delete().eq('id', selected.id);
    if (error) { alert('Error deleting: ' + error.message); return; }

    const remaining = leases.filter(l => l.id !== selected.id);
    setLeases(remaining);
    setSelected(remaining.length > 0 ? remaining[0] : null);
    await fetchAll();
  };

  const getDaysLeft = (endDate: string) =>
    Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / 86400000);

  const getStatusBadge = (lease: any) => {
    if (!lease.end_date) return { label: 'Active', color: T.greenDark, bg: T.greenLight };
    const days = getDaysLeft(lease.end_date);
    if (days < 0) return { label: 'Expired', color: T.coral, bg: T.coralLight };
    if (days <= 60) return { label: 'Expires Soon', color: T.amber, bg: T.amberLight };
    if (days <= 90) return { label: 'Renew Soon', color: T.amberDark, bg: T.amberLight };
    return { label: 'Active', color: T.greenDark, bg: T.greenLight };
  };

  const tenantPayments = selected
    ? payments.filter(p => p.lease_id === selected.id || p.tenant_name === selected.tenant_name)
    : [];
  const totalPaid = tenantPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const outstanding = tenantPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + (p.amount || 0), 0);

  const MSG_TYPES = [
    { id: 'late-rent', label: '💰 Late Rent' },
    { id: 'entry-notice', label: '🔑 Entry Notice' },
    { id: 'lease-renewal', label: '📄 Lease Renewal' },
    { id: 'move-out', label: '📦 Move-Out' },
    { id: 'rent-increase', label: '📈 Rent Increase' },
    { id: 'violation', label: '⚠️ Violation' },
    { id: 'general', label: '✉️ General' },
  ];

  const draftMessage = async () => {
    if (!selected) return;
    setDrafting(true);
    setDraft('');
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const lateFeeLine = selected.late_fee_percent
      ? 'Late fee per lease: ' + (selected.late_fee_type === 'fixed' ? '$' + selected.late_fee_percent : selected.late_fee_percent + '%') + ' after ' + (selected.late_fee_days || 3) + ' days.'
      : '';
    const prompts: Record<string, string> = {
      'late-rent': 'Draft a professional late rent notice. Date: ' + today + '. Tenant: ' + selected.tenant_name + ', Property: ' + selected.property + ', Rent: $' + selected.rent + '/mo. ' + lateFeeLine + ' Request payment within 3 days. Be firm but respectful. ' + context,
      'entry-notice': 'Draft a 24-hour entry notice. Date: ' + today + '. Tenant: ' + selected.tenant_name + ', Property: ' + selected.property + '. Reason: ' + (context || 'routine inspection') + '. Suggest next business day 10am-12pm.',
      'lease-renewal': 'Draft a warm lease renewal offer. Date: ' + today + '. Tenant: ' + selected.tenant_name + ', Property: ' + selected.property + ', Current rent: $' + selected.rent + '/mo, Lease ends: ' + selected.end_date + '. ' + (context || 'Offer 12-month renewal at 3% increase, 30-day response window.'),
      'move-out': 'Draft move-out instructions. Date: ' + today + '. Tenant: ' + selected.tenant_name + ', Property: ' + selected.property + ', Lease ends: ' + selected.end_date + '. Include cleaning expectations, key return, deposit return timeline (21 days). ' + context,
      'rent-increase': 'Draft a formal rent increase notice. Date: ' + today + '. Tenant: ' + selected.tenant_name + ', Property: ' + selected.property + ', Current rent: $' + selected.rent + '/mo. ' + (context || '5% increase effective in 60 days.'),
      'violation': 'Draft a lease violation notice. Date: ' + today + '. Tenant: ' + selected.tenant_name + ', Property: ' + selected.property + '. Violation: ' + (context || 'describe violation') + '. Include correction required and deadline.',
      'general': 'Draft a professional message. Date: ' + today + '. Tenant: ' + selected.tenant_name + ', Property: ' + selected.property + '. Message: ' + (context || 'general communication'),
    };
    const result = await callClaude(prompts[msgType]);
    setDraft(result);
    setDrafting(false);
  };

  const generateTransition = async (lease: any) => {
    setTransitionMsgs(prev => ({ ...prev, [lease.id]: { text: '', loading: true, copied: false, smsStatus: '', sending: false } }));
    const signature = [
      profile?.full_name || 'Your Landlord',
      profile?.company || '',
      profile?.phone || '',
      profile?.email || '',
    ].filter(Boolean).join('\n');
    const prompt = `Write a warm, professional welcome message from a landlord to their tenant. The landlord is transitioning property management to Keywise, a new platform where tenants can pay rent and message their landlord directly.

Tenant name: ${lease.tenant_name}
Property address: ${lease.property}
Monthly rent: $${lease.rent}/mo
Landlord contact info:
${signature}

Include:
- A friendly intro explaining that property management is moving to Keywise
- The tenant's name, property address, and monthly rent ($${lease.rent}/mo)
- That they will receive a login invitation to Keywise to pay rent and message the landlord directly
- Reassurance that this is an improvement — simpler payments and direct communication
- The landlord's name and contact info as a closing signature

Keep it warm, clear, and under 180 words. No bullet points. Format as a letter.`;
    const result = await callClaude(prompt);
    setTransitionMsgs(prev => ({ ...prev, [lease.id]: { text: result, loading: false, copied: false, smsStatus: '', sending: false } }));
  };

  const copyTransition = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setTransitionMsgs(prev => ({ ...prev, [id]: { ...prev[id], copied: true } }));
    setTimeout(() => setTransitionMsgs(prev => ({ ...prev, [id]: { ...prev[id], copied: false } })), 2000);
  };

  const smsTransition = async (lease: any, text: string) => {
    if (!lease.phone) {
      setTransitionMsgs(prev => ({ ...prev, [lease.id]: { ...prev[lease.id], smsStatus: '✗ No phone number on file' } }));
      return;
    }
    setTransitionMsgs(prev => ({ ...prev, [lease.id]: { ...prev[lease.id], sending: true, smsStatus: '' } }));
    const smsResult = await callClaude('Summarize this landlord message into a short, friendly SMS. Maximum 300 characters. No formal headers — just the key info conversationally. End with the landlord\'s first name if available (' + (profile?.full_name?.split(' ')[0] || '') + ').\n\nOriginal message:\n' + text);
    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: lease.phone, message: smsResult }),
    });
    const data = await res.json();
    const status = data.error ? '✗ SMS failed: ' + data.error : '✓ SMS sent to ' + lease.phone;
    setTransitionMsgs(prev => ({ ...prev, [lease.id]: { ...prev[lease.id], sending: false, smsStatus: status } }));
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: T.inkMuted }}>Loading tenants…</div>
  );

  if (leases.length === 0) return (
    <>
      {showWizard && <AddTenantWizard onClose={() => setShowWizard(false)} onComplete={() => { fetchAll(); setShowWizard(false); }} />}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 60, textAlign: 'center', boxShadow: T.shadow }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
        <div style={{ fontWeight: 700, fontSize: 20, color: T.navy, marginBottom: 8 }}>No tenants yet</div>
        <div style={{ color: T.inkMuted, fontSize: 14, marginBottom: 28 }}>Add your first tenant to start tracking leases, payments, and communications.</div>
        <button onClick={() => setShowWizard(true)}
          style={{ ...btn.primary, fontSize: 15, padding: '12px 28px', background: T.teal, color: T.navy, fontWeight: 700 }}>
          + Add Your First Tenant
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '220px 1fr', gap: 20, height: isMobile ? 'auto' : 'calc(100vh - 140px)' }}>
      {showWizard && <AddTenantWizard onClose={() => setShowWizard(false)} onComplete={() => { fetchAll(); setShowWizard(false); }} />}

      {/* Receipt sent toast */}
      {tenantReceiptSent && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#1A1A2E', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <span style={{ color: T.teal }}>✓</span> Receipt sent to {tenantReceiptSent}
        </div>
      )}

      {/* Tenant list — on mobile, hide when a tenant is selected */}
      {(!isMobile || !selected) && (
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : undefined }}>
        <div style={{ padding: '10px 12px 10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {leases.length} Tenant{leases.length !== 1 ? 's' : ''}
          </span>
          <button onClick={() => setShowWizard(true)}
            style={{ background: T.navy, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            + Add
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {leases.map(lease => {
            const status = getStatusBadge(lease);
            const isSelected = selected?.id === lease.id;
            const hasOverdue = payments.some(p => (p.lease_id === lease.id || p.tenant_name === lease.tenant_name) && p.status === 'overdue');
            return (
              <div key={lease.id} onClick={() => {
                setSelected(lease); setEditing(false); setDraft('');
                if (tab === 'transition' && !transitionMsgs[lease.id]) generateTransition(lease);
              }}
                style={{
                  padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
                  background: isSelected ? T.bg : 'transparent',
                  borderLeft: isSelected ? `2px solid ${T.navy}` : '2px solid transparent',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>{lease.tenant_name}</div>
                  {hasOverdue && (
                    <span style={{ fontSize: 9, background: T.coralLight, color: T.coral, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>OVERDUE</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{lease.property?.split(',')[0]}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.navy }}>${(lease.rent || 0).toLocaleString()}/mo</span>
                  <span style={{ fontSize: 10, background: status.bg, color: status.color, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Tenant detail */}
      {selected && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}` }}>
            {isMobile && (
              <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: T.navy, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 0 12px' }}>
                ← Back to tenants
              </button>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: isMobile ? 18 : 20, color: T.navy }}>{selected.tenant_name}</div>
                <div style={{ fontSize: 13, color: T.inkMuted, marginTop: 2 }}>{selected.property}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  {selected.email && <span style={{ fontSize: 12, color: T.inkMid }}>📧 {selected.email}</span>}
                  {selected.phone && <span style={{ fontSize: 12, color: T.inkMid }}>📞 {selected.phone}</span>}
                </div>
                {isMobile && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>${(selected.rent || 0).toLocaleString()}/mo</div>
                    <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{selected.start_date} → {selected.end_date}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: 8, width: isMobile ? '100%' : 'auto' }}>
                {!isMobile && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: T.navy }}>${(selected.rent || 0).toLocaleString()}/mo</div>
                    <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                      {selected.start_date} → {selected.end_date}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                  {selected.invite_sent && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.inkMuted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' as const }}>
                      ✓ Invited {selected.invite_sent_at ? new Date(selected.invite_sent_at).toLocaleDateString() : ''}
                    </span>
                  )}
                  <button onClick={async () => {
                    if (!selected.email) { alert('No email on file for this tenant. Add their email first.'); return; }
                    setInviteSending(true);
                    setInviteMagicLink(null);
                    setInviteSmsSent(null);
                    const { data: { session: invSession } } = await supabase.auth.getSession();
                    const res = await fetch('/api/invite-tenant', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${invSession?.access_token}` },
                      body: JSON.stringify({ lease_id: selected.id, tenant_email: selected.email, tenant_name: selected.tenant_name }),
                    });
                    const data = await res.json();
                    setInviteSending(false);
                    if (data.error) { alert('Error: ' + data.error); }
                    else {
                      setInviteSuccess(true);
                      setLeases(leases.map(l => l.id === selected.id ? { ...l, invite_sent: true, invite_sent_at: new Date().toISOString() } : l));
                      setSelected({ ...selected, invite_sent: true, invite_sent_at: new Date().toISOString() });
                      if (data.magic_link) setInviteMagicLink(data.magic_link);
                      if (data.sent_sms && data.phone) setInviteSmsSent(data.phone);
                      setTimeout(() => setInviteSuccess(false), 3000);
                    }
                  }}
                    style={{ background: T.tealLight, color: T.tealDark, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: isMobile ? '5px 10px' : '6px 14px', fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: inviteSending ? 'default' : 'pointer', opacity: inviteSending ? 0.7 : 1 }}>
                    {inviteSending ? 'Sending...' : inviteSuccess ? '✓ Link generated!' : selected.invite_sent ? '↺ Resend' : '✉️ Invite'}
                  </button>
                  {!isMobile && (
                    <button
                      onClick={() => window.open(`/?tenant_preview=true&lease_id=${selected.id}`, '_blank')}
                      style={{ ...btn.ghost, fontSize: 12, padding: '6px 14px' }}>
                      👁 Preview
                    </button>
                  )}
                  <button onClick={() => { setTab('overview'); openEdit(); }}
                    style={{ ...btn.ghost, fontSize: isMobile ? 11 : 12, padding: isMobile ? '5px 10px' : '6px 14px' }}>
                    ✏️ Edit
                  </button>
                  <button onClick={removeTenant}
                    style={{ ...btn.danger, fontSize: isMobile ? 11 : 12, padding: isMobile ? '5px 10px' : '6px 14px' }}>
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {/* Magic link copy box — always shown after invite */}
            {inviteMagicLink && (
              <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: '14px 16px', marginTop: 12 }}>
                {inviteSmsSent && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.greenDark, marginBottom: 8 }}>
                    ✓ Sent via SMS to {inviteSmsSent}
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 600, color: T.tealDark, marginBottom: 6 }}>
                  Share this link with your tenant:
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    readOnly
                    value={inviteMagicLink}
                    style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '6px 10px', fontSize: 11, fontFamily: 'monospace', color: T.inkMid, outline: 'none' }}
                    onFocus={e => e.target.select()}
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteMagicLink); setInviteLinkCopied(true); setTimeout(() => setInviteLinkCopied(false), 2000); }}
                    style={{ ...btn.ghost, fontSize: 12, padding: '6px 12px', flexShrink: 0 }}>
                    {inviteLinkCopied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
              {[
                { label: 'Total Paid', value: '$' + totalPaid.toLocaleString(), color: T.greenDark },
                { label: 'Outstanding', value: '$' + outstanding.toLocaleString(), color: outstanding > 0 ? T.coral : T.inkMuted },
                { label: 'Payments', value: tenantPayments.length, color: T.navy },
              ].map(s => (
                <div key={s.label} style={{ background: T.bg, borderRadius: T.radiusSm, padding: '10px 14px' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, padding: isMobile ? '0 16px' : '0 24px', overflowX: 'auto' as const, flexWrap: 'nowrap' as const, WebkitOverflowScrolling: 'touch' as any }}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'payments', label: 'Payments (' + tenantPayments.length + ')' },
              { id: 'communications', label: '✦ Message' },
              { id: 'documents', label: '📁 Docs' },
              { id: 'inspections', label: '🔍 Inspect' },
              { id: 'transition', label: '🏠 Transition' },
            ].map(t => (
              <button key={t.id} onClick={() => {
                setTab(t.id as any);
                setEditing(false);
                if (t.id === 'transition' && selected && !transitionMsgs[selected.id]) {
                  generateTransition(selected);
                }
              }}
                style={{
                  padding: isMobile ? '10px 12px' : '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: isMobile ? 12 : 13, fontWeight: tab === t.id ? 700 : 400,
                  color: tab === t.id ? T.navy : T.inkMuted,
                  borderBottom: tab === t.id ? `2px solid ${T.navy}` : '2px solid transparent',
                  marginBottom: -1, fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>

            {/* OVERVIEW — view or edit */}
            {tab === 'overview' && !editing && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Lease Start', value: selected.start_date || '—' },
                    { label: 'Lease End', value: selected.end_date || '—' },
                    { label: 'Monthly Rent', value: '$' + (selected.rent || 0).toLocaleString() },
                    { label: 'Security Deposit', value: '$' + (selected.deposit || 0).toLocaleString() },
                    { label: 'Payment Due', value: selected.payment_day ? (selected.payment_day + (selected.payment_day === 1 ? 'st' : selected.payment_day === 2 ? 'nd' : selected.payment_day === 3 ? 'rd' : 'th') + ' of month') : '1st of month' },
                    { label: 'Frequency', value: selected.payment_frequency || 'Monthly' },
                    { label: 'Late Fee', value: selected.late_fee_percent ? (selected.late_fee_type === 'fixed' ? '$' + selected.late_fee_percent : selected.late_fee_percent + '%') + ' after ' + (selected.late_fee_days || 3) + ' days' : '—' },
                    { label: 'Status', value: selected.status || 'active' },
                  ].map(item => (
                    <div key={item.label} style={{ background: T.bg, borderRadius: T.radiusSm, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginTop: 4, textTransform: 'capitalize' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                {selected.lease_terms_raw && (
                  <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.tealDark, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Late Fee — Contract Language</div>
                    <div style={{ fontSize: 12, color: T.inkMid, fontStyle: 'italic', lineHeight: 1.6 }}>"{selected.lease_terms_raw}"</div>
                  </div>
                )}
              </div>
            )}

            {/* OVERVIEW — edit mode */}
            {tab === 'overview' && editing && editForm && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {[
                    { label: 'Tenant Name', key: 'tenant_name', type: 'text' },
                    { label: 'Property', key: 'property', type: 'text' },
                    { label: 'Tenant Email Address', key: 'email', type: 'email' },
                    { label: 'Phone', key: 'phone', type: 'tel' },
                    { label: 'Monthly Rent ($)', key: 'rent', type: 'number' },
                    { label: 'Security Deposit ($)', key: 'deposit', type: 'number' },
                    { label: 'Lease Start', key: 'start_date', type: 'date' },
                    { label: 'Lease End', key: 'end_date', type: 'date' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={label}>{f.label}</label>
                      <input type={f.type} style={input} value={editForm[f.key] || ''}
                        onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={label}>Status</label>
                    <select style={input} value={editForm.status}
                      onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                      {['active', 'expired', 'terminated', 'pending'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={label}>Payment Due Day</label>
                    <select style={input} value={editForm.payment_day}
                      onChange={e => setEditForm({ ...editForm, payment_day: +e.target.value })}>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={label}>Frequency</label>
                    <select style={input} value={editForm.payment_frequency}
                      onChange={e => setEditForm({ ...editForm, payment_frequency: e.target.value })}>
                      {['monthly', 'bi-weekly', 'weekly'].map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={label}>Late Fee Type</label>
                    <select style={input} value={editForm.late_fee_type}
                      onChange={e => setEditForm({ ...editForm, late_fee_type: e.target.value })}>
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed ($)</option>
                    </select>
                  </div>
                  <div>
                    <label style={label}>{editForm.late_fee_type === 'fixed' ? 'Late Fee ($)' : 'Late Fee (%)'}</label>
                    <input type="number" style={input} value={editForm.late_fee_percent || ''}
                      onChange={e => setEditForm({ ...editForm, late_fee_percent: e.target.value })} />
                  </div>
                  <div>
                    <label style={label}>Grace Period (days)</label>
                    <input type="number" style={input} value={editForm.late_fee_days || ''}
                      onChange={e => setEditForm({ ...editForm, late_fee_days: e.target.value })} />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={label}>Late Fee Clause (from contract)</label>
                  <textarea value={editForm.lease_terms_raw || ''} onChange={e => setEditForm({ ...editForm, lease_terms_raw: e.target.value })}
                    placeholder="Paste the exact late fee language from your lease…"
                    style={{ ...input, minHeight: 60, resize: 'vertical' as const }} />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={saveLease} disabled={saving} style={{ ...btn.primary }}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)} style={{ ...btn.ghost }}>Cancel</button>
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {tab === 'payments' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>Payment History</div>
                    <button onClick={fetchAll} style={{ ...btn.ghost, fontSize: 11, padding: '4px 10px' }}>↻ Refresh</button>
                  </div>
                  <button
                    onClick={() => {
                      setShowPaymentRequest(true);
                      setPrSuccess('');
                      setPrForm({ type: 'Monthly Rent', amount: selected.rent ? String(selected.rent) : '', description: '', due_date: '', recurring: false, notify_email: true, notify_sms: true });
                    }}
                    style={{ ...btn.primary, fontSize: 12, padding: '7px 14px' }}>
                    + Payment Request
                  </button>
                </div>

                {prSuccess && (
                  <div style={{ background: T.greenLight, border: `1px solid ${T.greenDark}33`, borderRadius: T.radiusSm, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: T.greenDark, fontWeight: 600 }}>
                    {prSuccess}
                  </div>
                )}

                {tenantPayments.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: T.inkMuted, fontSize: 13 }}>
                    No payment records yet. Use "+ Payment Request" to create one.
                  </div>
                )}

                {tenantPayments.map(p => (
                  <div key={p.id} style={{ padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>${(p.amount || 0).toLocaleString()}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' as const,
                            background: p.status === 'paid' ? T.greenLight : p.status === 'overdue' ? T.coralLight : T.amberLight,
                            color: p.status === 'paid' ? T.greenDark : p.status === 'overdue' ? T.coral : T.amberDark,
                          }}>
                            {p.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 3 }}>
                          Due {p.due_date}
                          {p.description && <span style={{ color: T.inkMid }}> · {p.description}</span>}
                        </div>
                        {p.status === 'paid' && p.paid_date && (
                          <div style={{ fontSize: 12, color: T.greenDark, marginTop: 2 }}>
                            ✓ Paid {p.paid_date}{p.method ? ' · ' + p.method : ''}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {p.status !== 'paid' && p.payment_link_url && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(p.payment_link_url); setPrLinkCopied(p.id); setTimeout(() => setPrLinkCopied(null), 2000); }}
                            style={{ ...btn.ghost, fontSize: 11, padding: '4px 10px' }}>
                            {prLinkCopied === p.id ? '✓ Copied' : '🔗 Copy Link'}
                          </button>
                        )}
                        {(p.status === 'pending' || p.status === 'overdue') && (
                          <button
                            onClick={async () => {
                              const landlordName = profile?.full_name || profile?.company || 'Your landlord';
                              const amountNum = p.amount || 0;
                              const promises: Promise<any>[] = [];
                              if (selected.email && p.payment_link_url) {
                                promises.push(fetch('/api/send-email', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    to: selected.email,
                                    subject: `Payment Reminder: $${amountNum.toLocaleString()} due ${p.due_date}`,
                                    from_name: landlordName,
                                    html: `<p>Hi ${selected.tenant_name},</p><p>This is a reminder that a payment of $${amountNum.toLocaleString()} is due on ${p.due_date}${p.description ? ' for ' + p.description : ''}.</p><p><a href="${p.payment_link_url}" style="background:#00D4AA;color:#0F3460;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;">Pay Now →</a></p><p>— ${landlordName}</p>`,
                                  }),
                                }));
                              }
                              if (selected.phone && p.payment_link_url) {
                                promises.push(fetch('/api/send-sms', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    to: selected.phone,
                                    message: `Hi ${(selected.tenant_name || '').split(' ')[0]}! Reminder: $${amountNum.toLocaleString()} is due ${p.due_date}${p.description ? ' for ' + p.description : ''}. Pay here: ${p.payment_link_url}`,
                                  }),
                                }));
                              }
                              await Promise.all(promises);
                              setPrSuccess(`✓ Reminder sent to ${selected.tenant_name}`);
                              setTimeout(() => setPrSuccess(''), 4000);
                            }}
                            style={{ ...btn.ghost, fontSize: 11, padding: '4px 10px' }}>
                            ↺ Resend
                          </button>
                        )}
                        {(p.status === 'pending' || p.status === 'overdue') && (
                          <button
                            onClick={() => { setMarkingPaid(p.id); setMarkPaidMethod('Zelle'); setMarkPaidDate(new Date().toISOString().split('T')[0]); }}
                            style={{ ...btn.primary, fontSize: 11, padding: '4px 10px' }}>
                            ✓ Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Mark Paid inline form */}
                    {markingPaid === p.id && (
                      <div style={{ marginTop: 10, background: T.bg, borderRadius: T.radiusSm, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
                        <div>
                          <label style={{ ...label, fontSize: 11 }}>Date Paid</label>
                          <input type="date" style={{ ...input, fontSize: 12, padding: '5px 8px' }} value={markPaidDate} onChange={e => setMarkPaidDate(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ ...label, fontSize: 11 }}>Method</label>
                          <select style={{ ...input, fontSize: 12, padding: '5px 8px' }} value={markPaidMethod} onChange={e => setMarkPaidMethod(e.target.value)}>
                            {['Zelle', 'Venmo', 'Cash', 'Check', 'Bank Transfer', 'Credit Card', 'Other'].map(m => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={async () => {
                              const { error } = await supabase.from('payments').update({ status: 'paid', paid_date: markPaidDate, method: markPaidMethod }).eq('id', p.id);
                              if (!error) {
                                setPayments(payments.map(x => x.id === p.id ? { ...x, status: 'paid', paid_date: markPaidDate, method: markPaidMethod } : x));
                                setMarkingPaid(null);
                                if (selected.email) {
                                  const { data: { user } } = await supabase.auth.getUser();
                                  const { data: prof } = await supabase.from('profiles').select('full_name, email').eq('id', user!.id).single();
                                  const { data: { session: rcptSession } } = await supabase.auth.getSession();
                                  fetch('/api/send-receipt', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rcptSession?.access_token}` },
                                    body: JSON.stringify({
                                      payment_id: p.id,
                                      tenant_name: selected.tenant_name,
                                      tenant_email: selected.email,
                                      property: selected.property,
                                      amount: p.amount,
                                      paid_date: markPaidDate,
                                      method: markPaidMethod,
                                      landlord_name: prof?.full_name || '',
                                      landlord_email: prof?.email || '',
                                    }),
                                  }).then(r => r.ok && (setTenantReceiptSent(selected.email), setTimeout(() => setTenantReceiptSent(null), 5000)));
                                }
                              }
                            }}
                            style={{ ...btn.primary, fontSize: 12, padding: '6px 14px' }}>
                            Confirm
                          </button>
                          <button onClick={() => setMarkingPaid(null)} style={{ ...btn.ghost, fontSize: 12, padding: '6px 14px' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Payment Request Modal */}
                {showPaymentRequest && (
                  <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowPaymentRequest(false); }}>
                    <div style={{ background: T.surface, borderRadius: T.radius, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.navy }}>New Payment Request</div>
                        <button onClick={() => setShowPaymentRequest(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: T.inkMuted, lineHeight: 1 }}>×</button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={label}>Payment Type</label>
                          <select style={input} value={prForm.type} onChange={e => setPrForm({ ...prForm, type: e.target.value })}>
                            {['Monthly Rent', 'Security Deposit', 'Late Fee', 'Maintenance', 'Utilities', 'Other'].map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={label}>Amount ($)</label>
                          <input type="number" style={input} value={prForm.amount} onChange={e => setPrForm({ ...prForm, amount: e.target.value })} placeholder="0.00" />
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={label}>Description (optional)</label>
                        <input type="text" style={input} value={prForm.description} onChange={e => setPrForm({ ...prForm, description: e.target.value })} placeholder="e.g. March rent, Broken window repair…" />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                          <label style={label}>Due Date</label>
                          <input type="date" style={input} value={prForm.due_date} onChange={e => setPrForm({ ...prForm, due_date: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.ink }}>
                            <input type="checkbox" checked={prForm.recurring} onChange={e => setPrForm({ ...prForm, recurring: e.target.checked })} />
                            Recurring monthly
                          </label>
                        </div>
                      </div>

                      <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: '12px 14px', marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: 8 }}>Notify Tenant</div>
                        <div style={{ display: 'flex', gap: 20 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: T.ink, opacity: selected.email ? 1 : 0.45 }}>
                            <input type="checkbox" checked={prForm.notify_email} disabled={!selected.email} onChange={e => setPrForm({ ...prForm, notify_email: e.target.checked })} />
                            Email{!selected.email ? ' (no email on file)' : ''}
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: T.ink, opacity: selected.phone ? 1 : 0.45 }}>
                            <input type="checkbox" checked={prForm.notify_sms} disabled={!selected.phone} onChange={e => setPrForm({ ...prForm, notify_sms: e.target.checked })} />
                            SMS{!selected.phone ? ' (no phone on file)' : ''}
                          </label>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          disabled={prSending || !prForm.amount || !prForm.due_date}
                          onClick={async () => {
                            if (!prForm.amount || !prForm.due_date) return;
                            setPrSending(true);
                            const { data: { user: prUser } } = await supabase.auth.getUser();
                            const payload = {
                              landlord_id: prUser?.id,
                              lease_id: selected.id,
                              type: prForm.type,
                              amount: parseFloat(prForm.amount),
                              description: prForm.description,
                              due_date: prForm.due_date,
                              recurring: prForm.recurring,
                              tenant_email: selected.email,
                              tenant_phone: selected.phone,
                              tenant_name: selected.tenant_name,
                              property: selected.property,
                              notify_email: prForm.notify_email,
                              notify_sms: prForm.notify_sms,
                            };
                            console.log('[payment-request] Sending payload:', JSON.stringify(payload));
                            const res = await fetch('/api/payment-request', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                            });
                            const data = await res.json();
                            console.log('[payment-request] Response status:', res.status, '| body:', JSON.stringify(data));
                            setPrSending(false);
                            if (data.error) {
                              alert('Error: ' + data.error);
                            } else {
                              setShowPaymentRequest(false);
                              const count = data.payments_created || 1;
                              setPrSuccess(`✓ Payment request sent to ${selected.tenant_name}${count > 1 ? ` (${count} payments created)` : ''}`);
                              setTimeout(() => setPrSuccess(''), 5000);
                              const { data: updatedPayments } = await supabase.from('payments').select('*').order('due_date', { ascending: false });
                              if (updatedPayments) setPayments(updatedPayments);
                            }
                          }}
                          style={{ ...btn.primary, flex: 1, opacity: (!prForm.amount || !prForm.due_date || prSending) ? 0.6 : 1 }}>
                          {prSending ? 'Sending…' : 'Send Payment Request'}
                        </button>
                        <button onClick={() => setShowPaymentRequest(false)} style={{ ...btn.ghost }}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTS */}
            {tab === 'documents' && selected && (() => {
              const docs = tenantDocs.filter(d => (d.tenant_name === selected.tenant_name || d.lease_id === selected.id) && d.type !== 'move_in' && d.type !== 'move_out' && d.type !== 'inspection');
              const hasLease = docs.some((d: any) => d.type === 'lease');
              const insurance = docs.find((d: any) => d.type === 'insurance_renters');
              const insuranceExpired = insurance?.expiry_date && new Date(insurance.expiry_date) < new Date();
              const DOC_ICONS: Record<string, string> = { lease: '📄', insurance_renters: '🛡️', insurance_property: '🏠', inspection: '🔍', move_in: '📋', move_out: '📦', repair_receipt: '🔧', other: '📎' };

              const saveDoc = async () => {
                if (!docFile) return;
                setDocSaving(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { setDocSaving(false); return; }
                const ext = docFile.name.split('.').pop();
                const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                await supabase.storage.from('documents').upload(path, docFile);
                await supabase.from('documents').insert({
                  user_id: user.id, name: docForm.name || docFile.name.replace(/\.[^/.]+$/, ''),
                  type: docForm.type, ownership_level: 'tenant',
                  property: selected.property || '', tenant_name: selected.tenant_name || '',
                  lease_id: selected.id, expiry_date: docForm.expiry_date || null,
                  notes: '', file_url: '', file_path: path,
                  size: (docFile.size / 1024).toFixed(0) + ' KB',
                });
                setDocSaving(false); setShowDocUpload(false); setDocFile(null);
                setDocForm({ name: '', type: 'other', expiry_date: '' });
                fetchAll();
              };

              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>Documents ({docs.length})</div>
                    <button onClick={() => setShowDocUpload(true)} style={{ ...btn.primary, fontSize: 12, padding: '7px 14px' }}>+ Upload</button>
                  </div>

                  {/* Warnings */}
                  {!hasLease && (
                    <div style={{ background: T.amberLight, border: `1px solid ${T.amberDark}33`, borderRadius: T.radiusSm, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: T.amberDark, fontWeight: 600 }}>
                      ⚠ No signed lease on file
                    </div>
                  )}
                  {!insurance && (
                    <div style={{ background: T.amberLight, border: `1px solid ${T.amberDark}33`, borderRadius: T.radiusSm, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: T.amberDark, fontWeight: 600 }}>
                      ⚠ No renter's insurance on file
                    </div>
                  )}
                  {insuranceExpired && (
                    <div style={{ background: T.coralLight, border: `1px solid ${T.coral}33`, borderRadius: T.radiusSm, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: T.coral, fontWeight: 600 }}>
                      ⚠ Renter's insurance expired {insurance.expiry_date}
                    </div>
                  )}

                  {docs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: T.inkMuted, fontSize: 13 }}>No documents yet. Upload a lease, insurance cert, or other document.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {docs.map((d: any) => {
                        const isExpired = d.expiry_date && new Date(d.expiry_date) < new Date();
                        const isExpiring = d.expiry_date && !isExpired && Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000) <= 60;
                        return (
                          <div key={d.id} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{DOC_ICONS[d.type] || '📎'}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 10, fontWeight: 600, color: T.inkMuted, background: T.surface, border: `1px solid ${T.border}`, padding: '1px 6px', borderRadius: 10, textTransform: 'capitalize' }}>{(d.type || 'other').replace(/_/g, ' ')}</span>
                                  {d.signed_at && <span style={{ fontSize: 10, fontWeight: 700, color: T.greenDark, background: '#E8F8F0', padding: '1px 6px', borderRadius: 10 }}>✓ Signed</span>}
                                  {isExpired && <span style={{ fontSize: 10, fontWeight: 700, color: T.coral, background: T.coralLight, padding: '1px 6px', borderRadius: 10 }}>EXPIRED</span>}
                                  {isExpiring && <span style={{ fontSize: 10, fontWeight: 700, color: T.amberDark, background: T.amberLight, padding: '1px 6px', borderRadius: 10 }}>EXPIRING</span>}
                                  {d.expiry_date && !isExpired && !isExpiring && <span style={{ fontSize: 10, color: T.inkMuted }}>Exp: {d.expiry_date}</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                              <button onClick={async () => {
                                if (!d.file_path) return;
                                const { data } = await supabase.storage.from('documents').createSignedUrl(d.file_path, 300);
                                if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                              }} style={{ ...btn.ghost, fontSize: 11, padding: '6px 12px', minHeight: 36 }}>👁 View</button>
                              <button onClick={async () => {
                                if (!confirm('Delete "' + d.name + '"? This cannot be undone.')) return;
                                if (d.file_path) await supabase.storage.from('documents').remove([d.file_path]);
                                await supabase.from('documents').delete().eq('id', d.id);
                                fetchAll();
                              }} style={{ ...btn.danger, fontSize: 11, padding: '6px 10px', minHeight: 36 }}>✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Upload modal */}
                  {showDocUpload && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                      onClick={() => setShowDocUpload(false)}>
                      <div style={{ background: T.surface, borderRadius: 16, padding: isMobile ? 20 : 32, width: isMobile ? '95%' : 440, maxWidth: 440, maxHeight: '85vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: T.navy, marginBottom: 16 }}>Upload Document for {selected.tenant_name}</div>
                        <div onClick={() => docFileRef.current?.click()}
                          style={{ border: `2px dashed ${T.border}`, borderRadius: T.radiusSm, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: docFile ? '#E8F8F0' : T.surface }}>
                          <input ref={docFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) { setDocFile(f); if (!docForm.name) setDocForm(prev => ({ ...prev, name: f.name.replace(/\.[^/.]+$/, '') })); } }} />
                          {docFile ? <div style={{ color: T.greenDark, fontWeight: 600, fontSize: 13 }}>✓ {docFile.name}</div>
                            : <div style={{ color: T.inkMuted, fontSize: 13 }}>Drop file or click to browse</div>}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, display: 'block', marginBottom: 4 }}>Document Name</label>
                          <input style={input} value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} placeholder="e.g. Renter's Insurance 2026" />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, display: 'block', marginBottom: 4 }}>Type</label>
                          <select style={input} value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })}>
                            <option value="lease">Lease</option>
                            <option value="insurance_renters">Renter's Insurance</option>
                            <option value="move_in">Move-In Checklist</option>
                            <option value="move_out">Move-Out Checklist</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, display: 'block', marginBottom: 4 }}>Expiry Date (optional)</label>
                          <input style={input} type="date" value={docForm.expiry_date} onChange={e => setDocForm({ ...docForm, expiry_date: e.target.value })} />
                        </div>
                        <div style={{ position: 'sticky', bottom: 0, background: T.surface, paddingTop: 16, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10 }}>
                          <button onClick={saveDoc} disabled={docSaving || !docFile} style={{ ...btn.primary, flex: 1, opacity: !docFile ? 0.5 : 1 }}>
                            {docSaving ? 'Saving...' : 'Save Document'}
                          </button>
                          <button onClick={() => { setShowDocUpload(false); setDocFile(null); }} style={{ ...btn.ghost }}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* INSPECTIONS */}
            {tab === 'inspections' && selected && (
              <Inspections lease={selected} />
            )}

            {/* TRANSITION */}
            {tab === 'transition' && selected && (() => {
              const msg = transitionMsgs[selected.id];
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 2 }}>Transition to Keywise</div>
                      <div style={{ fontSize: 12, color: T.inkMuted }}>
                        Send {selected.tenant_name} a welcome message explaining the move to Keywise.
                      </div>
                    </div>
                    <button
                      onClick={() => generateTransition(selected)}
                      disabled={msg?.loading}
                      style={{ ...btn.teal, fontSize: 12, padding: '7px 14px', opacity: msg?.loading ? 0.6 : 1 }}>
                      {msg?.loading ? '✦ Generating…' : msg?.text ? '↺ Regenerate' : '✦ Generate'}
                    </button>
                  </div>

                  {!msg && (
                    <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 28, textAlign: 'center', fontSize: 13, color: T.inkMuted, border: `1px dashed ${T.border}` }}>
                      Generating welcome message…
                    </div>
                  )}

                  {msg?.loading && (
                    <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 28, textAlign: 'center', fontSize: 13, color: T.tealDark, border: `1px solid ${T.border}` }}>
                      ✦ Drafting message…
                    </div>
                  )}

                  {msg?.text && !msg?.loading && (
                    <>
                      <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 16, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 340, overflowY: 'auto', color: T.ink, border: `1px solid ${T.border}`, marginBottom: 12 }}>
                        {msg.text}
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          onClick={() => copyTransition(selected.id, msg.text)}
                          style={{
                            ...btn.ghost, fontSize: 12, padding: '6px 14px',
                            background: msg.copied ? T.tealLight : T.surface,
                            color: msg.copied ? T.tealDark : T.inkMid,
                            border: `1px solid ${msg.copied ? T.teal + '66' : T.border}`,
                          }}>
                          {msg.copied ? '✓ Copied!' : '📋 Copy'}
                        </button>

                        <button
                          onClick={() => window.open('mailto:' + (selected.email || '') + '?subject=' + encodeURIComponent('Welcome to Keywise — ' + selected.property) + '&body=' + encodeURIComponent(msg.text))}
                          disabled={!selected.email}
                          style={{ ...btn.teal, fontSize: 12, padding: '6px 14px', opacity: selected.email ? 1 : 0.4 }}
                          title={selected.email || 'No email on file'}>
                          ✉️ Open in Email
                        </button>

                        <button
                          onClick={() => smsTransition(selected, msg.text)}
                          disabled={msg.sending || !selected.phone}
                          style={{ ...btn.ghost, fontSize: 12, padding: '6px 14px', opacity: selected.phone ? 1 : 0.4 }}
                          title={selected.phone || 'No phone on file'}>
                          {msg.sending ? '📱 Sending…' : '📱 Send SMS'}
                        </button>

                        {msg.smsStatus && (
                          <span style={{
                            fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                            background: msg.smsStatus.includes('✗') ? T.coralLight : T.tealLight,
                            color: msg.smsStatus.includes('✗') ? T.coral : T.tealDark,
                          }}>
                            {msg.smsStatus}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* COMMUNICATIONS */}
            {tab === 'communications' && (
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {MSG_TYPES.map(t => (
                    <button key={t.id} onClick={() => { setMsgType(t.id); setDraft(''); }}
                      style={{
                        padding: '6px 12px', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: msgType === t.id ? T.navy : T.bg,
                        color: msgType === t.id ? 'white' : T.inkMid,
                        border: `1px solid ${msgType === t.id ? T.navy : T.border}`,
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={label}>Additional context (optional)</label>
                  <textarea value={context} onChange={e => setContext(e.target.value)}
                    placeholder="Add specific details, dates, amounts…"
                    style={{ ...input, minHeight: 70, resize: 'vertical' as const }} />
                </div>

                <button onClick={draftMessage} disabled={drafting} style={{ ...btn.primary, marginBottom: 16 }}>
                  {drafting ? 'Drafting…' : '✦ Draft Message'}
                </button>

                {draft && (
                  <div>
                    <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 16, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 10, maxHeight: 300, overflowY: 'auto', color: T.ink }}>
                      {draft}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        style={{ ...btn.ghost, fontSize: 12, padding: '6px 14px' }}>
                        {copied ? '✓ Copied!' : '📋 Copy'}
                      </button>
                      <button onClick={() => window.open('mailto:' + (selected.email || '') + '?subject=' + encodeURIComponent(MSG_TYPES.find(m => m.id === msgType)?.label + ' — ' + selected.property) + '&body=' + encodeURIComponent(draft))}
                        style={{ ...btn.teal, fontSize: 12, padding: '6px 14px' }}>
                        ✉️ Open in Email
                      </button>
                      <button onClick={() => setDraft('')} style={{ ...btn.danger, fontSize: 12, padding: '6px 14px' }}>Dismiss</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}