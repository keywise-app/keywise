'use client';
import AddTenantWizard from './AddTenantWizard';
import { workspaceFetch } from '../lib/workspace-api';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { callClaude } from '../lib/claude';
import { T, input, label, btn } from '../lib/theme';

type Lease = {
  id: string;
  tenant_name: string;
  property: string;
  rent: number;
  deposit: number;
  start_date: string;
  end_date: string;
  status: string;
  email: string;
  phone: string;
  payment_day: number;
  payment_frequency: string;
  late_fee_percent: number;
  late_fee_days: number;
  late_fee_type: string;
  lease_terms_raw: string;
};

type RenewalOptions = {
  increaseType: 'fixed' | 'percent' | 'market';
  increaseValue: string;
  newTerm: '12' | '6' | 'month-to-month';
  notes: string;
};

function getDaysLeft(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / 86400000);
}

function formatDaysLeft(days: number) {
  if (days < 0) return 'Expired ' + Math.abs(days) + ' days ago';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 90) return days + ' days left';
  const months = Math.floor(days / 30);
  return months + ' month' + (months !== 1 ? 's' : '') + ' left';
}

function getLeaseStatus(endDate: string) {
  const days = getDaysLeft(endDate);
  if (days < 0) return { label: 'EXPIRED', color: T.coral, bg: T.coralLight };
  if (days <= 60) return { label: 'EXPIRES SOON', color: T.amber, bg: T.amberLight };
  if (days <= 90) return { label: 'RENEW SOON', color: T.amberDark, bg: T.amberLight };
  return { label: 'ACTIVE', color: T.greenDark, bg: T.greenLight };
}

const LEASE_FIELDS = [
  { label: 'Tenant Full Name', key: 'tenant_name', type: 'text' },
  { label: 'Property Address', key: 'property', type: 'text' },
  { label: 'Monthly Rent ($)', key: 'rent', type: 'number' },
  { label: 'Security Deposit ($)', key: 'deposit', type: 'number' },
  { label: 'Lease Start Date', key: 'start_date', type: 'date' },
  { label: 'Lease End Date', key: 'end_date', type: 'date' },
  { label: 'Tenant Email', key: 'email', type: 'email' },
  { label: 'Tenant Phone', key: 'phone', type: 'text' },
];

export default function Leases() {
  const [tab, setTab] = useState<'tracker' | 'generator'>('tracker');
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [renewalDrafts, setRenewalDrafts] = useState<{ [key: string]: string }>({});
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [renewalWizard, setRenewalWizard] = useState<Lease | null>(null);
  const [renewalOptions, setRenewalOptions] = useState<RenewalOptions>({
    increaseType: 'percent', increaseValue: '3', newTerm: '12', notes: '',
  });
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const [form, setForm] = useState({
    tenant: '', property: '', rent: '', deposit: '',
    start: '', end: '', state: 'California',
    pets: 'no pets', parking: 'included', laundry: 'in-unit',
  });
  const [generatedLease, setGeneratedLease] = useState('');
  const [generating, setGenerating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { fetchLeases(); }, []);

  const fetchLeases = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('leases').select('*').order('end_date', { ascending: true });
    if (!error && data) setLeases(data);
    setLoading(false);
  };


  const openEdit = (lease: Lease) => {
    setEditingLease(lease);
    setEditForm({
      tenant_name: lease.tenant_name || '', property: lease.property || '',
      rent: lease.rent || '', deposit: lease.deposit || '',
      start_date: lease.start_date || '', end_date: lease.end_date || '',
      email: lease.email || '', phone: lease.phone || '',
      status: lease.status || 'active',
      payment_day: lease.payment_day || 1,
      payment_frequency: lease.payment_frequency || 'monthly',
      late_fee_percent: lease.late_fee_percent || 5,
      late_fee_days: lease.late_fee_days || 3,
      late_fee_type: lease.late_fee_type || 'percent',
      lease_terms_raw: lease.lease_terms_raw || '',
    });
  };

  const saveLease = async () => {
    if (!editingLease) return;
    setSaving(true);
    const { error } = await supabase.from('leases').update({
      tenant_name: editForm.tenant_name,
      property: editForm.property,
      rent: +editForm.rent,
      deposit: +editForm.deposit || 0,
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      email: editForm.email,
      phone: editForm.phone,
      status: editForm.status,
      payment_day: +editForm.payment_day || 1,
      payment_frequency: editForm.payment_frequency || 'monthly',
      late_fee_percent: +editForm.late_fee_percent || 5,
      late_fee_days: +editForm.late_fee_days || 3,
      late_fee_type: editForm.late_fee_type || 'percent',
      lease_terms_raw: editForm.lease_terms_raw || '',
    }).eq('id', editingLease.id);
    if (error) { alert('Error updating: ' + error.message); }
    else { await fetchLeases(); setEditingLease(null); setEditForm(null); }
    setSaving(false);
  };

  const removeLease = async (id: string) => {
    if (!confirm('Remove this lease?')) return;
    await supabase.from('leases').delete().eq('id', id);
    setLeases(leases.filter(l => l.id !== id));
  };

  const openRenewalWizard = (lease: Lease) => {
    setRenewalWizard(lease);
    setRenewalOptions({ increaseType: 'percent', increaseValue: '3', newTerm: '12', notes: '' });
  };

  const draftRenewal = async () => {
    if (!renewalWizard) return;
    setDraftingId(renewalWizard.id);
    setRenewalWizard(null);

    const { data: { user } } = await supabase.auth.getUser();
    let profile = { full_name: '', email: '', phone: '', company: '', address: '' };
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) profile = data;
    }

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const signature = [profile.full_name || 'Your Landlord', profile.company || '', profile.phone || '', profile.email || '', profile.address || ''].filter(Boolean).join('\n');
    const currentRent = renewalWizard.rent;
    let newRent = currentRent;
    let rentDescription = '';

    if (renewalOptions.increaseType === 'percent') {
      newRent = Math.round(currentRent * (1 + +renewalOptions.increaseValue / 100));
      rentDescription = renewalOptions.increaseValue + '% increase — new rent $' + newRent + '/mo';
    } else if (renewalOptions.increaseType === 'fixed') {
      newRent = currentRent + +renewalOptions.increaseValue;
      rentDescription = '$' + renewalOptions.increaseValue + ' increase — new rent $' + newRent + '/mo';
    } else {
      rentDescription = 'market rate research requested — propose a competitive rate based on similar units in the area';
    }

    const termDescription = renewalOptions.newTerm === 'month-to-month' ? 'month-to-month' : renewalOptions.newTerm + '-month lease';

    const result = await callClaude('Draft a professional lease renewal offer letter with today\'s date at the top.\n\nDate: ' + today + '\n\nTo: ' + renewalWizard.tenant_name + '\nProperty: ' + renewalWizard.property + '\n\nFrom:\n' + signature + '\n\nLease details:\n- Current rent: $' + currentRent + '/mo\n- Lease expires: ' + renewalWizard.end_date + '\n- Proposed new term: ' + termDescription + '\n- Rent change: ' + rentDescription + '\n' + (renewalOptions.notes ? '- Additional notes: ' + renewalOptions.notes : '') + '\n\n' + (renewalOptions.increaseType === 'market' ? 'Research typical rents for similar units in this area and justify the proposed rent increase with market data. ' : '') + 'Write a warm professional letter. Include the date at the top. Request a response within 30 days. End with a proper signature block.');
    setRenewalDrafts(prev => ({ ...prev, [renewalWizard.id]: result }));
    setDraftingId(null);
  };

  const generateLease = async () => {
    setGenerating(true);
    setGeneratedLease('');
    const result = await callClaude('Generate a complete professional residential lease agreement for ' + form.state + '. Tenant: ' + form.tenant + '. Property: ' + form.property + '. Monthly Rent: $' + form.rent + '. Security Deposit: $' + form.deposit + '. Lease Start: ' + form.start + '. Lease End: ' + form.end + '. Pets: ' + form.pets + '. Parking: ' + form.parking + '. Laundry: ' + form.laundry + '. Include all standard clauses: payment due 1st of month, 5% late fee after 3-day grace, utilities, maintenance responsibilities, 24-hour entry notice, no subletting, termination, and state-specific disclosures. Use numbered sections.');
    setGeneratedLease(result);
    setGenerating(false);
  };

  const renewalAlerts = leases.filter(l => getDaysLeft(l.end_date) <= 90);

  const tabBtn = (id: string, label: string) => (
    <button onClick={() => setTab(id as any)}
      style={{
        padding: '9px 20px', borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        background: tab === id ? T.navy : T.surface,
        color: tab === id ? 'white' : T.inkMid,
        border: `1px solid ${tab === id ? T.navy : T.border}`,
      }}>
      {label}
    </button>
  );

  const renderLeaseFormFields = (f: any, set: (v: any) => void) => (
    <div>
      {LEASE_FIELDS.map(field => (
        <div key={field.key} style={{ marginBottom: 14 }}>
          <label style={label}>{field.label}</label>
          <input type={field.type} value={f[field.key] || ''}
            onChange={e => set({ ...f, [field.key]: e.target.value })} style={input} />
        </div>
      ))}

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Status</label>
        <select value={f.status || 'active'} onChange={e => set({ ...f, status: e.target.value })} style={input}>
          {['active', 'expired', 'terminated', 'pending'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Payment & Late Fee Terms */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
          Payment & Late Fee Terms
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={label}>Payment Frequency</label>
            <select value={f.payment_frequency || 'monthly'} onChange={e => set({ ...f, payment_frequency: e.target.value })} style={input}>
              <option value="monthly">Monthly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label style={label}>Payment Due Day</label>
            <select value={f.payment_day || 1} onChange={e => set({ ...f, payment_day: +e.target.value })} style={input}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : d + 'th'}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Late Fee Type</label>
            <select value={f.late_fee_type || 'percent'} onChange={e => set({ ...f, late_fee_type: e.target.value })} style={input}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed Amount ($)</option>
            </select>
          </div>
          <div>
            <label style={label}>{f.late_fee_type === 'fixed' ? 'Late Fee Amount ($)' : 'Late Fee (%)'}</label>
            <input type="number" value={f.late_fee_percent || ''} onChange={e => set({ ...f, late_fee_percent: e.target.value })} style={input} placeholder={f.late_fee_type === 'fixed' ? '50' : '5'} />
          </div>
          <div>
            <label style={label}>Grace Period (days)</label>
            <input type="number" value={f.late_fee_days || ''} onChange={e => set({ ...f, late_fee_days: e.target.value })} style={input} placeholder="3" />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Late Fee Clause (from contract)</label>
          <textarea value={f.lease_terms_raw || ''} onChange={e => set({ ...f, lease_terms_raw: e.target.value })}
            placeholder="Paste the exact late fee language from your lease here…"
            style={{ ...input, minHeight: 70, resize: 'vertical' as const, fontFamily: 'inherit' }} />
          {f.lease_terms_raw && (
            <div style={{ fontSize: 11, color: T.tealDark, marginTop: 4 }}>✓ Contract language saved — will appear in payment schedule wizard</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabBtn('tracker', '📋 Lease Tracker (' + leases.length + ')')}
        {tabBtn('generator', '✦ Generate New Lease')}
      </div>

      {tab === 'tracker' && (
        <div>
          {renewalAlerts.length > 0 && (
            <div style={{ background: T.amberLight, border: `1px solid ${T.amber}44`, borderRadius: T.radiusSm, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.amberDark }}>Renewal Action Required</div>
                <div style={{ fontSize: 13, color: T.inkMid, marginTop: 2 }}>
                  {renewalAlerts.map(l => l.tenant_name + ' — ' + formatDaysLeft(getDaysLeft(l.end_date))).join(' · ')}
                </div>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDrop={e => { e.preventDefault(); setDragOver(false); const files = Array.from(e.dataTransfer.files); if (files.length) { setImportFiles(files); setShowAdd(true); } }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => setShowAdd(true)}
            style={{
              border: '2px dashed ' + (dragOver ? T.navy : T.border),
              borderRadius: T.radius, padding: '20px', textAlign: 'center',
              cursor: 'pointer', marginBottom: 20,
              background: dragOver ? T.tealLight : T.surface,
              transition: 'all 0.15s',
            }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>Drop your leases here to add rentals</div>
            <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4 }}>Upload together · Review building, units and tenants once</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setShowAdd(true)} style={{ ...btn.primary }}>+ Add Lease</button>
          </div>

          {loading && <div style={{ textAlign: 'center', padding: 40, color: T.inkMuted }}>Loading leases…</div>}

          {!loading && leases.length === 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', boxShadow: T.shadow }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 6 }}>No leases yet</div>
              <div style={{ color: T.inkMuted, fontSize: 13, marginBottom: 20 }}>Drop a lease PDF above or click Add Lease to get started.</div>
              <button onClick={() => setShowAdd(true)} style={{ ...btn.primary }}>+ Add Your First Lease</button>
            </div>
          )}

          {leases.map(lease => {
            const status = getLeaseStatus(lease.end_date);
            const days = getDaysLeft(lease.end_date);
            return (
              <div key={lease.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 22, marginBottom: 14, boxShadow: T.shadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: T.ink }}>{lease.tenant_name}</div>
                      <span style={{ background: status.bg, color: status.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{status.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: …5677 tokens truncated…e approval, checks the base revision and existing future activity, creates/replaces only reviewed future charges, and applies current rent on the property's effective civil date through a guarded cron.
- Email approvals persist content digests and provider-acceptance state. Recipient identity is derived on the server, duplicate submissions share a provider idempotency key, and uncertain delivery is not labeled delivered.
- Selected history exports produce authenticated JSON manifests with expiring original-file links and tenant filtering. They are not bundled archives. Fixed-schema server outcomes measure import, payment and renewal milestones without message/document content or financial amounts.

Existing commercial plan definitions remain unchanged. The PRD's P2 intake integrations and pricing experiments are not enabled.

## Repeatable validation

Run `npm ci`, then `npm run test:workspace`. PGlite is a committed development dependency; no temporary external install is required. The command runs:

1. Domain tests for tenancy lifecycle, confirmed/partial rent arithmetic, unit identity, calendar schedules, extraction unknowns, approval digests and membership isolation.
2. Real route-handler boundary tests with network access prohibited for anonymous requests.
3. Disposable PostgreSQL-compatible integration tests covering all new migrations, injected atomic rollback, stale/repeated approvals, unit limits, fractional-dollar storage, foreign IDs, partial receipts/refunds, reversals, provider replay/order, repair expense identity, renewal conflicts and effective civil dates, financial/profile write guards and RLS.

Build using the normal deployment environment and `npm run build`. Local builds used nonfunctional placeholders for required provider variables and a 6 GB Node heap; passing does not establish provider connectivity or live-schema compatibility.

## Required release gates

This remains a draft implementation, not a production release. Do not merge or promote it solely because local checks pass.

1. Inventory and back up the actual schema and reconcile legacy money units, manually marked paid rows, active payment links and in-flight attempts. The registered legacy `payments.amount` column is dollars; the migration widens it to `numeric(12,2)` without changing units. No automatic ambiguous historical backfill is authorized.
2. Apply the ordered `20261117*` migrations to an isolated copy of the real schema and validate data reconciliation. The disposable fixture cannot establish compatibility with untracked production schema changes. Deploy schema and application as a coordinated release; financial guards intentionally reject legacy direct-paid mutations.
3. Complete operational reconciliation for failed/expired attempts, dispute resolution and old payment links. A 23-hour retry limit fails closed before provider idempotency retention expires. No automatic fresh charge is created after that limit.
4. Complete scoped co-signer sharing and review former-occupant history boundaries, revocable invitations and all older RLS/service-role routes. Verify member revocation with real signed-in accounts and expired sessions.
5. Verify executed renewal source integrity, correction authors/version evidence, approval replay and conflicting concurrent edits against real provider sandboxes. Statutory notices remain a separately reviewed process. Sending a proposal is not tenant acceptance.
6. Exercise all legacy rent/schedule/expense screens against the new guards; verify partial-balance presentation throughout, online/manual retry recovery and document export expiry/missing originals.
7. Run signed-in browser E2E and human keyboard/screen-reader checks at 320/390/768/1280 px and 200% zoom. Verify dialog focus restoration, draft resumption, back/reload context, tenant privacy and all error/empty states.
8. Expand outcome instrumentation for repairs, failures/reversals and second-rent-cycle retention. Run the pre-specified RentSpree and TurboTenant task study before making any 30% faster claim.

## Deployment access

The connected Vercel account still returned HTTP 403 for the `keywise-apps-projects` team during this work. Team authorization is required before preview/deployment inspection. No production migration, real-money charge, tenant message or statutory notice was executed by this development session.

Preserve all user records on rollback. Keeping the new financial guards while reverting to a legacy application can intentionally block old direct-paid flows; reconcile deployment compatibility rather than dropping history or disabling safety checks casually.

## Batch lease onboarding (November 23)

The lease tracker, tenant onboarding and portfolio onboarding now share the same
occupied-rental import flow. Landlords can drop up to ten documents, extract two
concurrently, review all rentals together, apply one shared building address and
approve the batch. Manual entry uses the same path. Per-document errors retain
uploaded sources for retries; unsupported formats and missing browser MIME types
receive explicit handling. Optional contact and schedule fields are expandable.
Current terms and occupancy still require owner review; dates do not establish
continued occupancy. Existing unit/plan limits remain enforced.

Apply `20261123000000_batch_lease_onboarding.sql` after the existing migrations
before deploying this source. It adds service-role-only batch save/commit RPCs
and updates occupied-import creation to reuse an owner-scoped building. Commits
are atomic across the batch and replay the same approved draft identities.
A failed unit rolls back the entire batch, including newly created buildings.
The migration does not rewrite historical properties or merge existing buildings.

Validation includes regression coverage for missing file metadata, actionable
storage failures, private source ownership, duplicate rental identities, batch
rollback, unit caps, replay and stale drafts. `npm run test:workspace` includes
these checks. A production build with placeholder provider variables verifies
compilation only. Live upload/extraction and signed-in browser acceptance still
require verification. Under-five-minute duplex onboarding remains a target,
not a measured performance claim.
