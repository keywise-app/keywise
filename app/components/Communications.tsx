'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { callClaude } from '../lib/claude';
import { T, btn, card } from '../lib/theme';

type Tenant = {
  id: string;
  tenant_name: string;
  property: string;
  email: string;
  phone: string;
  rent: number;
  end_date: string;
};

type Profile = {
  full_name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
};

const MESSAGE_TYPES = [
  { id: 'late-rent', label: '💰 Late Rent', desc: 'Firm but professional overdue notice' },
  { id: 'entry-notice', label: '🔑 Entry Notice', desc: '24-hour notice before visiting' },
  { id: 'lease-renewal', label: '📄 Lease Renewal', desc: 'Offer to renew with new terms' },
  { id: 'move-out', label: '📦 Move-Out', desc: 'Instructions and deposit timeline' },
  { id: 'rent-increase', label: '📈 Rent Increase', desc: 'Formal notice with required lead time' },
  { id: 'violation', label: '⚠️ Lease Violation', desc: 'Notice to remedy a violation' },
  { id: 'maintenance', label: '🔧 Maintenance Update', desc: 'Update on repair status' },
  { id: 'welcome', label: '👋 Welcome New Tenant', desc: 'Warm welcome with key info' },
  { id: 'check-in', label: '💬 Check-In', desc: 'Friendly periodic check-in' },
  { id: 'listing', label: '🏠 Property Listing', desc: 'Compelling listing description' },
  { id: 'reply', label: '✦ AI Reply to Tenant', desc: 'Paste their message, AI replies based on your lease' },
];

export default function Communications() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [tab, setTab] = useState<'inbox' | 'transition' | 'draft' | 'history'>('inbox');
  const [transitionMsgs, setTransitionMsgs] = useState<Record<string, { text: string; loading: boolean; copied: boolean; smsStatus: string; sending: boolean }>>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [msgType, setMsgType] = useState('late-rent');
  const [tenantIdx, setTenantIdx] = useState(0);
  const [context, setContext] = useState('');
  const [tenantMessage, setTenantMessage] = useState('');
  const [leaseTerms, setLeaseTerms] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ id?: string; type: string; tenant: string; preview: string; date: string; channels: string[] }[]>([]);
  const [copied, setCopied] = useState(false);

  // Smart Reply inbox state
  const [inboxTenant, setInboxTenant] = useState(0);
  const [inboxMessage, setInboxMessage] = useState('');
  const [inboxReply, setInboxReply] = useState<{ reply: string; category: string; urgency: string; suggested_actions: string[]; sentiment: string } | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState('');
  const [inboxSending, setInboxSending] = useState(false);
  const [inboxSmsStatus, setInboxSmsStatus] = useState('');
  const [inboxSendEmail, setInboxSendEmail] = useState(false);
  const [inboxSendSMS, setInboxSendSMS] = useState(false);
  const [inboxCopied, setInboxCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [sendSMSToggle, setSendSMSToggle] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: tenantData } = await supabase
        .from('leases')
        .select('id, tenant_name, property, email, phone, rent, end_date')
        .order('tenant_name');
      if (tenantData) setTenants(tenantData);

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profileData) setProfile(profileData);
      }

      setLoadingTenants(false);
    };
    fetchData();
  }, []);

  // Fetch persisted history
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('message_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        setHistory(data.map((m: any) => ({
          id: m.id,
          type: m.type,
          tenant: m.tenant_name,
          preview: m.preview,
          date: m.created_at ? new Date(m.created_at).toLocaleDateString() : '',
          channels: m.channels || [],
        })));
      }
    })();
  }, []);

  const saveToHistory = async (type: string, tenantName: string, preview: string, channels: string[], fullText: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const entry = {
      user_id: user?.id,
      type,
      tenant_name: tenantName,
      preview: preview.slice(0, 120),
      full_text: fullText,
      channels,
    };
    const { data } = await supabase.from('message_history').insert(entry).select().single();
    setHistory(h => [{
      id: data?.id,
      type,
      tenant: tenantName,
      preview: preview.slice(0, 80) + '…',
      date: new Date().toLocaleDateString(),
      channels,
    }, ...h.slice(0, 49)]);
  };

  // Smart Reply handler
  const generateSmartReply = async () => {
    if (!inboxMessage.trim()) return;
    const t = tenants[inboxTenant];
    if (!t) return;
    setInboxLoading(true);
    setInboxReply(null);
    setInboxError('');
    setInboxSmsStatus('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInboxLoading(false); return; }

    try {
      const res = await fetch('/api/smart-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          tenant_name: t.tenant_name,
          property: t.property,
          rent: t.rent,
          lease_end: t.end_date,
          tenant_message: inboxMessage,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setInboxError(data.message || 'Failed to generate reply.');
      } else if (data.result) {
        setInboxReply(data.result);
      }
    } catch {
      setInboxError('Network error. Please try again.');
    }
    setInboxLoading(false);
  };

  const sendInboxReply = async () => {
    const t = tenants[inboxTenant];
    if (!t || !inboxReply) return;
    setInboxSending(true);
    setInboxSmsStatus('');
    const statuses: string[] = [];
    const channels: string[] = [];

    if (inboxSendEmail && t.email) {
      const subject = encodeURIComponent('Re: ' + t.property);
      const body = encodeURIComponent(inboxReply.reply);
      window.open('mailto:' + t.email + '?subject=' + subject + '&body=' + body);
      channels.push('email');
      statuses.push('✓ Email opened');
    }

    if (inboxSendSMS && t.phone) {
      const smsText = await callClaude('Summarize into a short friendly SMS under 300 chars. No headers. End with sender first name (' + (profile?.full_name?.split(' ')[0] || '') + ').\n\n' + inboxReply.reply);
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: t.phone, message: smsText }),
      });
      const data = await res.json();
      if (data.error) statuses.push('✗ SMS failed: ' + data.error);
      else { channels.push('sms'); statuses.push('✓ SMS sent'); }
    } else if (inboxSendSMS && !t.phone) {
      statuses.push('✗ No phone on file');
    }

    await saveToHistory('AI Reply (' + inboxReply.category + ')', t.tenant_name, inboxReply.reply, channels, inboxReply.reply);
    setInboxSmsStatus(statuses.join(' · '));
    setInboxSending(false);
  };

  const tenant = tenants[tenantIdx];

  const getPrompt = () => {
    if (!tenant) return '';

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const signature = [
      profile?.full_name || 'Your Landlord',
      profile?.company || '',
      profile?.phone || '',
      profile?.email || '',
      profile?.address || '',
    ].filter(Boolean).join('\n');

    const base = 'Today\'s date: ' + today + '\n\nLandlord:\n' + signature + '\n\nTenant: ' + tenant.tenant_name + '\nProperty: ' + tenant.property + '\nRent: $' + tenant.rent + '/mo\nLease ends: ' + tenant.end_date + '.';

    if (msgType === 'reply') {
      return 'You are a professional landlord. ' + base + '\n' +
        (leaseTerms ? 'Lease terms to reference: ' + leaseTerms + '\n' : '') +
        'The tenant sent this message: "' + tenantMessage + '"\n' +
        'Draft a professional, fair response. Include today\'s date at the top. Sign with the landlord\'s information.';
    }

    const prompts: Record<string, string> = {
      'late-rent': 'Draft a professional late rent notice letter. ' + base + ' Rent is overdue. Include today\'s date at the top. Request payment within 3 days, mention a late fee applies per the lease. Sign with the landlord\'s full signature block. Be firm but respectful. ' + context,
      'entry-notice': 'Draft a formal 24-hour entry notice. ' + base + ' Include today\'s date at the top. Reason for entry: ' + (context || 'routine inspection') + '. Include proposed date and time (suggest next business day 10am-12pm). Sign with the landlord\'s full signature block.',
      'lease-renewal': 'Draft a warm lease renewal offer letter. ' + base + ' Include today\'s date at the top. ' + (context || 'Offer 12-month renewal at 3% increase, request response within 30 days.') + ' Sign with the landlord\'s full signature block.',
      'move-out': 'Draft formal move-out instructions. ' + base + ' Include today\'s date at the top. Include: cleaning expectations, key return, forwarding address request, deposit return timeline (21 days). Sign with the landlord\'s full signature block. ' + context,
      'rent-increase': 'Draft a formal rent increase notice. ' + base + ' Include today\'s date at the top. ' + (context || 'Increase of 5%, effective in 60 days') + '. Include required notice period. Sign with the landlord\'s full signature block.',
      'violation': 'Draft a formal lease violation notice. ' + base + ' Include today\'s date at the top. Violation: ' + (context || 'describe the violation') + '. Include what was violated, correction required, deadline, and next steps. Sign with the landlord\'s full signature block.',
      'maintenance': 'Draft a professional maintenance update. ' + base + ' Include today\'s date at the top. Update: ' + (context || 'work is scheduled and will be completed soon') + '. Sign with the landlord\'s full signature block.',
    };
    return prompts[msgType] || '';
  };

  const draft = async () => {
    if (!tenant) return;
    if (msgType === 'reply' && !tenantMessage) return;
    setLoading(true);
    setResult('');
    setSmsStatus('');
    const result = await callClaude(getPrompt());
    setResult(result);
    setLoading(false);
  };

const sendAll = async () => {
  if (!tenant || !result) return;
  setSending(true);
  setSmsStatus('');
  const channels: string[] = [];
  const statuses: string[] = [];

  if (sendEmail) {
    const subject = encodeURIComponent(MESSAGE_TYPES.find(m => m.id === msgType)?.label + ' — ' + tenant.property);
    const body = encodeURIComponent(result);
    window.open('mailto:' + (tenant.email || '') + '?subject=' + subject + '&body=' + body);
    channels.push('email');
    statuses.push('✓ Email opened');
  }

  if (sendSMSToggle) {
    if (!tenant.phone) {
      statuses.push('✗ SMS failed — no phone number on file');
    } else {
      // Generate a short SMS version
      const shortMessage = await callClaude('Summarize this landlord message into a short, friendly SMS text message. Maximum 300 characters. No formal headers or signatures — just the key info conversationally. End with the landlord\'s first name if available (' + (profile?.full_name?.split(' ')[0] || '') + ').\n\nOriginal message:\n' + result);

      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: tenant.phone, message: shortMessage }),
      });
      const data = await res.json();
      if (data.error) {
        statuses.push('✗ SMS failed: ' + data.error);
      } else {
        channels.push('sms');
        statuses.push('✓ SMS sent to ' + tenant.phone);
      }
    }
  }

  await saveToHistory(
    MESSAGE_TYPES.find(m => m.id === msgType)?.label || msgType,
    tenant.tenant_name,
    result,
    channels,
    result
  );

  setSmsStatus(statuses.join(' · '));
  setSending(false);
};

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const anySendSelected = sendEmail || sendSMSToggle;

  const getTransitionPrompt = (t: Tenant) => {
    const signature = [
      profile?.full_name || 'Your Landlord',
      profile?.company || '',
      profile?.phone || '',
      profile?.email || '',
    ].filter(Boolean).join('\n');
    return `Write a warm, professional welcome message from a landlord to their tenant. The landlord is transitioning property management to Keywise, a new platform where tenants can pay rent and message their landlord directly.

Tenant name: ${t.tenant_name}
Property address: ${t.property}
Monthly rent: $${t.rent}/mo
Landlord contact info:\n${signature}

Include:
- A friendly intro explaining that property management is moving to Keywise
- The tenant's name, property address, and monthly rent
- That they will receive a login invitation to Keywise to pay rent and message the landlord directly through the platform
- Reassurance that this is an improvement — simpler payments and direct communication
- The landlord's name and contact info as a closing signature

Keep it warm, clear, and under 180 words. No bullet points. Format as a letter.`;
  };

  const generateTransition = async (t: Tenant) => {
    setTransitionMsgs(prev => ({ ...prev, [t.id]: { ...prev[t.id], text: '', loading: true, copied: false, smsStatus: '', sending: false } }));
    const result = await callClaude(getTransitionPrompt(t));
    setTransitionMsgs(prev => ({ ...prev, [t.id]: { text: result, loading: false, copied: false, smsStatus: '', sending: false } }));
  };

  const generateAllTransitions = async () => {
    if (tenants.length === 0) return;
    setGeneratingAll(true);
    await Promise.all(tenants.map(t => generateTransition(t)));
    setGeneratingAll(false);
  };

  const copyTransition = (id: string) => {
    navigator.clipboard.writeText(transitionMsgs[id]?.text || '');
    setTransitionMsgs(prev => ({ ...prev, [id]: { ...prev[id], copied: true } }));
    setTimeout(() => setTransitionMsgs(prev => ({ ...prev, [id]: { ...prev[id], copied: false } })), 2000);
  };

  const emailTransition = (t: Tenant, text: string) => {
    const subject = encodeURIComponent('Welcome to Keywise — ' + t.property);
    const body = encodeURIComponent(text);
    window.open('mailto:' + (t.email || '') + '?subject=' + subject + '&body=' + body);
  };

  const smsTransition = async (t: Tenant, text: string) => {
    if (!t.phone) {
      setTransitionMsgs(prev => ({ ...prev, [t.id]: { ...prev[t.id], smsStatus: '✗ No phone number on file' } }));
      return;
    }
    setTransitionMsgs(prev => ({ ...prev, [t.id]: { ...prev[t.id], sending: true, smsStatus: '' } }));
    const smsResult = await callClaude('Summarize this landlord message into a short, friendly SMS. Maximum 300 characters. No formal headers — just the key info conversationally. End with the landlord\'s first name if available (' + (profile?.full_name?.split(' ')[0] || '') + ').\n\nOriginal message:\n' + text);
    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: t.phone, message: smsResult }),
    });
    const data = await res.json();
    const status = data.error ? '✗ SMS failed: ' + data.error : '✓ SMS sent to ' + t.phone;
    setTransitionMsgs(prev => ({ ...prev, [t.id]: { ...prev[t.id], sending: false, smsStatus: status } }));
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto' as const, paddingBottom: 2 }}>
        {([
          { id: 'inbox', label: '✦ AI Smart Reply' },
          { id: 'draft', label: '📝 Draft Message' },
          { id: 'transition', label: '🔑 Transition' },
          { id: 'history', label: '📋 History (' + history.length + ')' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === t.id ? T.navy : T.surface,
              color: tab === t.id ? '#fff' : T.inkMid,
              border: '1px solid ' + (tab === t.id ? T.navy : T.border),
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* AI SMART REPLY INBOX */}
      {tab === 'inbox' && (
        <div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>✦</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>AI Smart Reply</span>
              <span style={{ background: T.teal, color: T.navy, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>AI</span>
            </div>
            <div style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.5 }}>
              Paste a tenant message. AI analyzes it against their lease, open maintenance issues, and payment history — then drafts a professional reply.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            {/* Left: input */}
            <div>
              <div style={{ ...card, marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Tenant</label>
                <select value={inboxTenant} onChange={e => { setInboxTenant(+e.target.value); setInboxReply(null); setInboxSmsStatus(''); }}
                  style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: T.ink }}>
                  {loadingTenants
                    ? <option>Loading…</option>
                    : tenants.length === 0
                      ? <option>No tenants — add leases first</option>
                      : tenants.map((t, i) => <option key={t.id} value={i}>{t.tenant_name} — {t.property}</option>)
                  }
                </select>
              </div>

              <div style={{ ...card }}>
                <label style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Tenant's Message</label>
                <textarea value={inboxMessage} onChange={e => setInboxMessage(e.target.value)}
                  placeholder="Paste the tenant's email, text, or message here..."
                  style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '12px', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 140, boxSizing: 'border-box' as const, fontFamily: 'inherit', color: T.ink, lineHeight: 1.6 }} />
                <button onClick={generateSmartReply} disabled={inboxLoading || !inboxMessage.trim() || tenants.length === 0}
                  style={{ ...btn.primary, width: '100%', marginTop: 12, opacity: !inboxMessage.trim() || tenants.length === 0 ? 0.5 : 1 }}>
                  {inboxLoading ? '✦ Analyzing & Drafting...' : '✦ Generate AI Reply'}
                </button>
              </div>
            </div>

            {/* Right: reply */}
            <div>
              {inboxError && (
                <div style={{ background: T.coralLight, border: `1px solid ${T.coral}33`, borderRadius: T.radiusSm, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: T.coral, fontWeight: 600 }}>
                  {inboxError}
                </div>
              )}

              {!inboxReply && !inboxLoading && (
                <div style={{ ...card, textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
                  <div style={{ color: T.inkMuted, fontSize: 13 }}>Paste a tenant message and click "Generate AI Reply" to get a professional response drafted instantly.</div>
                </div>
              )}

              {inboxLoading && (
                <div style={{ ...card, textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 14, color: T.tealDark, fontWeight: 600 }}>✦ Analyzing message...</div>
                  <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 6 }}>Checking lease terms, maintenance issues, and payment history</div>
                </div>
              )}

              {inboxReply && (
                <div>
                  {/* Classification badges */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10, textTransform: 'uppercase',
                      background: inboxReply.urgency === 'high' ? T.coralLight : inboxReply.urgency === 'medium' ? T.amberLight : T.tealLight,
                      color: inboxReply.urgency === 'high' ? T.coral : inboxReply.urgency === 'medium' ? T.amberDark : T.tealDark }}>
                      {inboxReply.urgency} urgency
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: T.bg, color: T.inkMid, textTransform: 'uppercase' }}>
                      {inboxReply.category}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                      background: inboxReply.sentiment === 'negative' ? T.coralLight : inboxReply.sentiment === 'positive' ? T.greenLight : T.bg,
                      color: inboxReply.sentiment === 'negative' ? T.coral : inboxReply.sentiment === 'positive' ? T.greenDark : T.inkMid }}>
                      {inboxReply.sentiment}
                    </span>
                  </div>

                  {/* Draft reply */}
                  <div style={{ ...card, marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>AI Draft Reply</div>
                    <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: 16, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: T.ink, border: `1px solid ${T.border}` }}>
                      {inboxReply.reply}
                    </div>
                  </div>

                  {/* Suggested actions */}
                  {inboxReply.suggested_actions && inboxReply.suggested_actions.length > 0 && (
                    <div style={{ ...card, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Suggested Actions</div>
                      {inboxReply.suggested_actions.map((a, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: 13, color: T.inkMid }}>
                          <span style={{ color: T.tealDark, fontWeight: 700 }}>→</span>
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Send controls */}
                  <div style={{ ...card }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Send Via</div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <button onClick={() => setInboxSendEmail(!inboxSendEmail)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          background: inboxSendEmail ? T.tealLight : T.surface,
                          color: inboxSendEmail ? T.tealDark : T.inkMid,
                          border: `1px solid ${inboxSendEmail ? T.teal + '66' : T.border}`,
                        }}>
                        {inboxSendEmail ? '✓ ' : ''}✉️ Email
                      </button>
                      <button onClick={() => setInboxSendSMS(!inboxSendSMS)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          background: inboxSendSMS ? T.tealLight : T.surface,
                          color: inboxSendSMS ? T.tealDark : T.inkMid,
                          border: `1px solid ${inboxSendSMS ? T.teal + '66' : T.border}`,
                        }}>
                        {inboxSendSMS ? '✓ ' : ''}📱 SMS
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={sendInboxReply} disabled={inboxSending || (!inboxSendEmail && !inboxSendSMS)}
                        style={{ ...btn.primary, flex: 1, opacity: !inboxSendEmail && !inboxSendSMS ? 0.5 : 1 }}>
                        {inboxSending ? 'Sending...' : 'Send Reply'}
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(inboxReply.reply); setInboxCopied(true); setTimeout(() => setInboxCopied(false), 2000); }}
                        style={{ ...btn.ghost }}>
                        {inboxCopied ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>

                    {inboxSmsStatus && (
                      <div style={{
                        marginTop: 10, padding: '8px 14px', borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600,
                        background: inboxSmsStatus.includes('✗') ? T.coralLight : T.greenLight,
                        color: inboxSmsStatus.includes('✗') ? T.coral : T.greenDark,
                      }}>
                        {inboxSmsStatus}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'transition' && (
        <div>
          {/* Header */}
          <div style={{ ...card, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 4 }}>Transition Tenants to Keywise</div>
              <div style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.5 }}>
                Generate a personalised welcome message for each tenant explaining the move to Keywise — where they can pay rent and reach you directly.
              </div>
            </div>
            <button
              onClick={generateAllTransitions}
              disabled={generatingAll || loadingTenants || tenants.length === 0}
              style={{
                ...btn.primary,
                background: T.teal, color: T.navy, borderRadius: 10,
                padding: '10px 22px', fontSize: 13, opacity: (generatingAll || tenants.length === 0) ? 0.6 : 1, flexShrink: 0,
              }}>
              {generatingAll ? '✦ Generating…' : '✦ Generate for All Tenants'}
            </button>
          </div>

          {!profile?.full_name && (
            <div style={{ background: T.amberLight, border: `1px solid ${T.amber}55`, borderRadius: 10, padding: '10px 16px', fontSize: 13, color: T.amberDark, marginBottom: 16 }}>
              ⚠ Complete your <strong>Profile</strong> (Settings) so messages include your name and contact info.
            </div>
          )}

          {loadingTenants && (
            <div style={{ textAlign: 'center', color: T.inkMuted, padding: 40, fontSize: 13 }}>Loading tenants…</div>
          )}

          {!loadingTenants && tenants.length === 0 && (
            <div style={{ ...card, textAlign: 'center', color: T.inkMuted, padding: 40, fontSize: 13 }}>
              No leases found — add leases in the Portfolio section first.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tenants.map(t => {
              const msg = transitionMsgs[t.id];
              return (
                <div key={t.id} style={{ ...card }}>
                  {/* Tenant header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>{t.tenant_name}</div>
                      <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                        {t.property} · ${t.rent}/mo
                        {t.email && <span> · {t.email}</span>}
                        {t.phone && <span> · {t.phone}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => generateTransition(t)}
                      disabled={msg?.loading}
                      style={{
                        ...btn.teal, borderRadius: 8, padding: '7px 16px', fontSize: 12, flexShrink: 0,
                        opacity: msg?.loading ? 0.6 : 1,
                      }}>
                      {msg?.loading ? '✦ Generating…' : msg?.text ? '↺ Regenerate' : '✦ Generate'}
                    </button>
                  </div>

                  {/* Message body */}
                  {!msg?.text && !msg?.loading && (
                    <div style={{ background: T.bg, borderRadius: 10, padding: '20px', textAlign: 'center', fontSize: 13, color: T.inkMuted, border: `1px dashed ${T.border}` }}>
                      Click <strong>Generate</strong> to draft a personalised welcome message for {t.tenant_name}.
                    </div>
                  )}

                  {msg?.loading && (
                    <div style={{ background: T.bg, borderRadius: 10, padding: '20px', textAlign: 'center', fontSize: 13, color: T.tealDark, border: `1px solid ${T.border}` }}>
                      ✦ Drafting message…
                    </div>
                  )}

                  {msg?.text && !msg?.loading && (
                    <>
                      <div style={{ background: T.bg, borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto', border: `1px solid ${T.border}`, marginBottom: 14, color: T.ink }}>
                        {msg.text}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          onClick={() => copyTransition(t.id)}
                          style={{
                            ...btn.ghost, padding: '7px 14px', fontSize: 12, borderRadius: 8,
                            background: msg.copied ? T.tealLight : T.surface,
                            color: msg.copied ? T.tealDark : T.inkMid,
                            border: `1px solid ${msg.copied ? T.teal + '66' : T.border}`,
                          }}>
                          {msg.copied ? '✓ Copied!' : '📋 Copy'}
                        </button>

                        <button
                          onClick={() => emailTransition(t, msg.text)}
                          disabled={!t.email}
                          style={{
                            ...btn.ghost, padding: '7px 14px', fontSize: 12, borderRadius: 8,
                            opacity: t.email ? 1 : 0.4,
                          }}
                          title={t.email ? t.email : 'No email on file'}>
                          ✉️ Open in Email
                        </button>

                        <button
                          onClick={() => smsTransition(t, msg.text)}
                          disabled={msg.sending || !t.phone}
                          style={{
                            ...btn.ghost, padding: '7px 14px', fontSize: 12, borderRadius: 8,
                            opacity: t.phone ? 1 : 0.4,
                          }}
                          title={t.phone ? t.phone : 'No phone on file'}>
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
            })}
          </div>
        </div>
      )}

      {tab === 'draft' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Message Type</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MESSAGE_TYPES.map(t => (
                  <div key={t.id} onClick={() => { setMsgType(t.id); setResult(''); setContext(''); setTenantMessage(''); setSmsStatus(''); }}
                    style={{
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      background: msgType === t.id ? '#D8EDDF' : '#F7F5F0',
                      border: '1px solid ' + (msgType === t.id ? '#2D6A4F' : '#E8E3D8'),
                    }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: msgType === t.id ? '#1A472A' : '#1C1C1C' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#8C8070', marginTop: 2 }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Tenant</div>
              <select value={tenantIdx} onChange={e => { setTenantIdx(+e.target.value); setResult(''); setSmsStatus(''); }}
                style={{ width: '100%', background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', marginBottom: 10 }}>
                {loadingTenants
                  ? <option>Loading tenants…</option>
                  : tenants.length === 0
                    ? <option>No leases found — add leases first</option>
                    : tenants.map((t, i) => <option key={t.id} value={i}>{t.tenant_name} — {t.property}</option>)
                }
              </select>
              {tenant && (
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#8C8070' }}>
                  {tenant.email && <span>📧 {tenant.email}</span>}
                  {tenant.phone && <span>📞 {tenant.phone}</span>}
                </div>
              )}
              {!loadingTenants && tenants.length === 0 && (
                <div style={{ fontSize: 12, color: '#C0392B', marginTop: 8 }}>Add leases first to use Communications.</div>
              )}
              {!profile?.full_name && (
                <div style={{ fontSize: 12, color: '#D4701A', marginTop: 10, background: '#FEF0E4', padding: '8px 10px', borderRadius: 6 }}>
                  ⚠ Complete your <strong>Profile</strong> so letters include your name and contact info.
                </div>
              )}
            </div>

            {msgType === 'reply' && (
              <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>✦ AI Reply to Tenant</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#8C8070', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>Tenant's Message</label>
                  <textarea value={tenantMessage} onChange={e => setTenantMessage(e.target.value)}
                    placeholder="Paste what the tenant wrote here…"
                    style={{ width: '100%', background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 90, boxSizing: 'border-box' as const, fontFamily: 'sans-serif' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#8C8070', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>Relevant Lease Terms (optional)</label>
                  <textarea value={leaseTerms} onChange={e => setLeaseTerms(e.target.value)}
                    placeholder="Paste the relevant section of your lease here…"
                    style={{ width: '100%', background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' as const, fontFamily: 'sans-serif' }} />
                </div>
              </div>
            )}

            {msgType !== 'reply' && (
              <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <label style={{ fontSize: 11, color: '#8C8070', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 8 }}>Additional Context (optional)</label>
                <textarea value={context} onChange={e => setContext(e.target.value)}
                  placeholder="Add specific details, dates, amounts, or any special instructions…"
                  style={{ width: '100%', background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' as const, fontFamily: 'sans-serif' }} />
              </div>
            )}

            <button onClick={draft} disabled={loading || !tenant}
              style={{ width: '100%', background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, opacity: !tenant ? 0.5 : 1 }}>
              {loading ? 'Drafting…' : '✦ Draft Message'}
            </button>

            {result && (
              <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Draft</div>

                <div style={{ background: '#F7F5F0', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                  {result}
                </div>

                <div style={{ background: '#F7F5F0', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8C8070', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 12 }}>Send Via</div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <button onClick={() => setSendEmail(!sendEmail)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: sendEmail ? '#D8EDDF' : 'white',
                        color: sendEmail ? '#2D6A4F' : '#4A4A4A',
                        border: '1px solid ' + (sendEmail ? '#2D6A4F' : '#E8E3D8'),
                      }}>
                      {sendEmail ? '✓ ' : ''}✉️ Email
                      {tenant?.email
                        ? <div style={{ fontSize: 10, color: sendEmail ? '#2D6A4F' : '#8C8070', marginTop: 2 }}>{tenant.email}</div>
                        : <div style={{ fontSize: 10, color: '#C0392B', marginTop: 2 }}>No email on file</div>
                      }
                    </button>
                    <button onClick={() => setSendSMSToggle(!sendSMSToggle)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: sendSMSToggle ? '#D8EDDF' : 'white',
                        color: sendSMSToggle ? '#2D6A4F' : '#4A4A4A',
                        border: '1px solid ' + (sendSMSToggle ? '#2D6A4F' : '#E8E3D8'),
                      }}>
                      {sendSMSToggle ? '✓ ' : ''}📱 SMS
                      {tenant?.phone
                        ? <div style={{ fontSize: 10, color: sendSMSToggle ? '#2D6A4F' : '#8C8070', marginTop: 2 }}>{tenant.phone}</div>
                        : <div style={{ fontSize: 10, color: '#C0392B', marginTop: 2 }}>No phone on file</div>
                      }
                    </button>
                  </div>

                  <button onClick={sendAll} disabled={sending || !anySendSelected}
                    style={{
                      width: '100%', padding: '11px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                      cursor: anySendSelected ? 'pointer' : 'not-allowed',
                      background: anySendSelected ? '#1A472A' : '#E8E3D8',
                      color: anySendSelected ? 'white' : '#8C8070',
                      border: 'none',
                    }}>
                    {sending ? 'Sending…' : anySendSelected ? '→ Send ' + (sendEmail && sendSMSToggle ? 'Email + SMS' : sendEmail ? 'Email' : 'SMS') : 'Select a channel above'}
                  </button>

                  {smsStatus && (
                    <div style={{
                      marginTop: 10, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: smsStatus.includes('✗') ? '#FDECEA' : '#D8EDDF',
                      color: smsStatus.includes('✗') ? '#C0392B' : '#2D6A4F',
                    }}>
                      {smsStatus}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={copy}
                    style={{ background: copied ? '#D8EDDF' : '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: copied ? '#2D6A4F' : '#1C1C1C' }}>
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                  <button onClick={() => { setResult(''); setSmsStatus(''); setSendEmail(false); setSendSMSToggle(false); }}
                    style={{ background: '#FDECEA', color: '#C0392B', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div style={{ ...card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>Message History</div>
            <span style={{ fontSize: 12, color: T.inkMuted }}>{history.length} messages</span>
          </div>
          {history.length === 0
            ? <div style={{ textAlign: 'center', color: T.inkMuted, padding: 40, fontSize: 13 }}>No messages sent yet. Draft a message or use Smart Reply to get started.</div>
            : history.map((h, i) => (
              <div key={h.id || i} style={{ padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: T.navy }}>{h.type} → {h.tenant}</div>
                  <div style={{ fontSize: 12, color: T.inkMuted }}>{h.date}</div>
                </div>
                <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 4 }}>{h.preview}</div>
                {h.channels.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {h.channels.map(c => (
                      <span key={c} style={{ background: T.tealLight, color: T.tealDark, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {c === 'email' ? '✉️ email' : '📱 sms'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}