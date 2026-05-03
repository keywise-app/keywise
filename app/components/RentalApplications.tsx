'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { callClaude } from '../lib/claude';
import { T, card, btn, input, label as labelStyle } from '../lib/theme';

type Listing = {
  id: string;
  property_address: string;
  rent: number;
  beds: number;
  baths: number;
  available_date: string;
  description: string;
  required_fields: string[];
  status: string;
  created_at: string;
};

type Application = {
  id: string;
  listing_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_data: Record<string, string>;
  status: string;
  ai_summary: string;
  created_at: string;
};

const FIELD_OPTIONS = [
  { id: 'name', label: 'Full Name', required: true },
  { id: 'email', label: 'Email', required: true },
  { id: 'phone', label: 'Phone', required: false },
  { id: 'current_address', label: 'Current Address', required: false },
  { id: 'employer', label: 'Employer', required: false },
  { id: 'job_title', label: 'Job Title', required: false },
  { id: 'income', label: 'Monthly Income', required: false },
  { id: 'move_in_date', label: 'Desired Move-In', required: false },
  { id: 'reason_for_moving', label: 'Reason for Moving', required: false },
  { id: 'num_occupants', label: 'Number of Occupants', required: false },
  { id: 'pets', label: 'Pets', required: false },
  { id: 'vehicles', label: 'Vehicles', required: false },
  { id: 'landlord_reference_name', label: 'Previous Landlord Name', required: false },
  { id: 'landlord_reference_phone', label: 'Previous Landlord Phone', required: false },
  { id: 'emergency_contact', label: 'Emergency Contact', required: false },
  { id: 'additional_info', label: 'Additional Info', required: false },
];

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  new: { bg: T.amberLight, color: T.amberDark, label: 'New' },
  reviewing: { bg: T.bg, color: T.navy, label: 'Reviewing' },
  approved: { bg: T.greenLight, color: T.greenDark, label: 'Approved' },
  rejected: { bg: T.coralLight, color: T.coral, label: 'Rejected' },
};

export default function RentalApplications() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [listings, setListings] = useState<Listing[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [properties, setProperties] = useState<{ address: string; beds: number; baths: number; current_rent: number }[]>([]);
  const [view, setView] = useState<'listings' | 'applications'>('applications');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    property_address: '',
    rent: '',
    beds: '',
    baths: '',
    available_date: '',
    description: '',
    required_fields: ['name', 'email', 'phone', 'current_address', 'employer', 'income', 'move_in_date', 'reason_for_moving'] as string[],
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [lRes, aRes, pRes] = await Promise.all([
      supabase.from('rental_listings').select('*').order('created_at', { ascending: false }),
      supabase.from('rental_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('properties').select('address, beds, baths, current_rent'),
    ]);
    if (lRes.data) setListings(lRes.data);
    if (aRes.data) setApplications(aRes.data);
    if (pRes.data) setProperties(pRes.data);
    setLoading(false);
  };

  const createListing = async () => {
    if (!form.property_address) { setError('Property address is required.'); return; }
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const res = await fetch('/api/rental-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_listing',
        user_id: user.id,
        property_address: form.property_address,
        rent: +form.rent || 0,
        beds: +form.beds || 0,
        baths: +form.baths || 0,
        available_date: form.available_date || null,
        description: form.description,
        required_fields: form.required_fields,
      }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); }
    else {
      setShowCreate(false);
      setForm({ property_address: '', rent: '', beds: '', baths: '', available_date: '', description: '', required_fields: ['name', 'email', 'phone', 'current_address', 'employer', 'income', 'move_in_date', 'reason_for_moving'] });
      await fetchAll();
    }
    setSaving(false);
  };

  const toggleField = (fieldId: string) => {
    const req = FIELD_OPTIONS.find(f => f.id === fieldId);
    if (req?.required) return;
    setForm(f => ({
      ...f,
      required_fields: f.required_fields.includes(fieldId)
        ? f.required_fields.filter(id => id !== fieldId)
        : [...f.required_fields, fieldId],
    }));
  };

  const toggleListingStatus = async (listing: Listing) => {
    const newStatus = listing.status === 'active' ? 'closed' : 'active';
    await supabase.from('rental_listings').update({ status: newStatus }).eq('id', listing.id);
    setListings(listings.map(l => l.id === listing.id ? { ...l, status: newStatus } : l));
  };

  const updateAppStatus = async (appId: string, status: string) => {
    await supabase.from('rental_applications').update({ status }).eq('id', appId);
    setApplications(applications.map(a => a.id === appId ? { ...a, status } : a));
    if (selectedApp?.id === appId) setSelectedApp({ ...selectedApp, status });
  };

  const summarizeApp = async (app: Application) => {
    setSummarizing(app.id);
    const listing = listings.find(l => l.id === app.listing_id);
    const details = Object.entries(app.applicant_data)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join('\n');

    const result = await callClaude(`You are a landlord's assistant. Summarize this rental application in 3-4 bullet points. Note any concerns or strengths. Be objective.

Property: ${listing?.property_address || 'Unknown'}, $${listing?.rent || 0}/mo
Applicant: ${app.applicant_name}

Application details:
${details}

Return a brief summary with key highlights and any flags.`);

    await supabase.from('rental_applications').update({ ai_summary: result }).eq('id', app.id);
    setApplications(applications.map(a => a.id === app.id ? { ...a, ai_summary: result } : a));
    if (selectedApp?.id === app.id) setSelectedApp({ ...selectedApp, ai_summary: result });
    setSummarizing(null);
  };

  const getAppLink = (listingId: string) => `${typeof window !== 'undefined' ? window.location.origin : 'https://keywise.app'}/apply/${listingId}`;

  const copyLink = (listingId: string) => {
    navigator.clipboard.writeText(getAppLink(listingId));
    setCopied(listingId);
    setTimeout(() => setCopied(null), 2000);
  };

  const newApps = applications.filter(a => a.status === 'new').length;

  if (loading) return (
    <div>
      <div style={{ ...card, height: 100, marginBottom: 12 }}><div style={{ height: 14, width: '40%', background: T.border, borderRadius: 6 }} /></div>
      <div style={{ ...card, height: 100 }}><div style={{ height: 14, width: '60%', background: T.border, borderRadius: 6 }} /></div>
    </div>
  );

  return (
    <div>
      {error && (
        <div style={{ background: T.coralLight, border: `1px solid ${T.coral}33`, borderRadius: T.radiusSm, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: T.coral, fontWeight: 600 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: T.coral, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('applications')}
            style={{ padding: '6px 14px', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: view === 'applications' ? T.navy : T.bg, color: view === 'applications' ? '#fff' : T.inkMid, border: `1px solid ${view === 'applications' ? T.navy : T.border}`, fontFamily: 'inherit' }}>
            Applications {newApps > 0 && <span style={{ background: T.coral, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, marginLeft: 4 }}>{newApps}</span>}
          </button>
          <button onClick={() => setView('listings')}
            style={{ padding: '6px 14px', borderRadius: T.radiusSm, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: view === 'listings' ? T.navy : T.bg, color: view === 'listings' ? '#fff' : T.inkMid, border: `1px solid ${view === 'listings' ? T.navy : T.border}`, fontFamily: 'inherit' }}>
            Listings ({listings.length})
          </button>
        </div>
        <button onClick={() => { setShowCreate(true); setError(''); }}
          style={{ ...btn.primary }}>
          + Create Listing
        </button>
      </div>

      {/* APPLICATIONS VIEW */}
      {view === 'applications' && (
        applications.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 6 }}>No applications yet</div>
            <div style={{ color: T.inkMuted, fontSize: 13, maxWidth: 400, margin: '0 auto 20px' }}>
              Create a listing and share the link with prospective tenants. Applications will appear here.
            </div>
            <button onClick={() => setShowCreate(true)} style={{ ...btn.primary }}>+ Create First Listing</button>
          </div>
        ) : (
          <div>
            {selectedApp ? (
              /* Application detail */
              <div>
                <button onClick={() => setSelectedApp(null)} style={{ ...btn.ghost, marginBottom: 14, fontSize: 12 }}>← Back to all applications</button>
                <div style={{ ...card, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>{selectedApp.applicant_name}</div>
                      <div style={{ fontSize: 13, color: T.inkMuted }}>
                        {selectedApp.applicant_email}{selectedApp.applicant_phone ? ` · ${selectedApp.applicant_phone}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 4 }}>
                        Applied {new Date(selectedApp.created_at).toLocaleDateString()} · {listings.find(l => l.id === selectedApp.listing_id)?.property_address || ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['new', 'reviewing', 'approved', 'rejected'].map(s => {
                        const sc = STATUS_CONFIG[s] || STATUS_CONFIG.new;
                        const active = selectedApp.status === s;
                        return (
                          <button key={s} onClick={() => updateAppStatus(selectedApp.id, s)}
                            style={{ padding: '5px 12px', borderRadius: T.radiusSm, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: active ? 'none' : `1px solid ${T.border}`, background: active ? sc.bg : T.surface, color: active ? sc.color : T.inkMuted, fontFamily: 'inherit' }}>
                            {sc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Summary */}
                  {selectedApp.ai_summary ? (
                    <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 14, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.tealDark, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>✦ AI Summary</div>
                      <div style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedApp.ai_summary}</div>
                    </div>
                  ) : (
                    <button onClick={() => summarizeApp(selectedApp)} disabled={summarizing === selectedApp.id}
                      style={{ ...btn.teal, marginBottom: 16, opacity: summarizing === selectedApp.id ? 0.7 : 1 }}>
                      {summarizing === selectedApp.id ? '✦ Summarizing...' : '✦ AI Summarize Application'}
                    </button>
                  )}

                  {/* Application fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                    {Object.entries(selectedApp.applicant_data).filter(([, v]) => v).map(([key, value]) => (
                      <div key={key} style={{ background: T.bg, borderRadius: T.radiusSm, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{key.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: 14, color: T.ink, fontWeight: 500 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    <button onClick={() => window.open('mailto:' + selectedApp.applicant_email + '?subject=' + encodeURIComponent('Re: Application for ' + (listings.find(l => l.id === selectedApp.listing_id)?.property_address || '')))}
                      style={{ ...btn.ghost, fontSize: 12, padding: '7px 14px' }}>
                      ✉️ Email Applicant
                    </button>
                    {selectedApp.applicant_phone && (
                      <button onClick={() => window.open('tel:' + selectedApp.applicant_phone)}
                        style={{ ...btn.ghost, fontSize: 12, padding: '7px 14px' }}>
                        📞 Call
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Application list */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {applications.map(app => {
                  const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG.new;
                  const listing = listings.find(l => l.id === app.listing_id);
                  return (
                    <div key={app.id} onClick={() => setSelectedApp(app)}
                      style={{ ...card, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>{app.applicant_name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, textTransform: 'uppercase' }}>{sc.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: T.inkMuted }}>
                          {listing?.property_address?.split(',')[0] || '—'} · {app.applicant_email} · {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{ color: T.inkMuted, fontSize: 14, flexShrink: 0 }}>→</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {/* LISTINGS VIEW */}
      {view === 'listings' && (
        listings.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 6 }}>No listings yet</div>
            <div style={{ color: T.inkMuted, fontSize: 13, marginBottom: 20 }}>Create a listing to start accepting rental applications.</div>
            <button onClick={() => setShowCreate(true)} style={{ ...btn.primary }}>+ Create First Listing</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {listings.map(listing => {
              const appCount = applications.filter(a => a.listing_id === listing.id).length;
              const newCount = applications.filter(a => a.listing_id === listing.id && a.status === 'new').length;
              return (
                <div key={listing.id} style={{ ...card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>{listing.property_address}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: listing.status === 'active' ? T.greenLight : T.bg, color: listing.status === 'active' ? T.greenDark : T.inkMuted, textTransform: 'uppercase' }}>{listing.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.inkMuted }}>
                        ${listing.rent.toLocaleString()}/mo · {listing.beds} bed · {listing.baths} bath · {appCount} application{appCount !== 1 ? 's' : ''}
                        {newCount > 0 && <span style={{ color: T.coral, fontWeight: 600 }}> · {newCount} new</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button onClick={() => copyLink(listing.id)}
                        style={{ ...btn.teal, padding: '5px 12px', fontSize: 11 }}>
                        {copied === listing.id ? '✓ Copied!' : '🔗 Copy Link'}
                      </button>
                      <button onClick={() => toggleListingStatus(listing)}
                        style={{ ...btn.ghost, padding: '5px 12px', fontSize: 11 }}>
                        {listing.status === 'active' ? '⏸ Close' : '▶ Reopen'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* CREATE LISTING MODAL */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,52,96,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
          onClick={() => setShowCreate(false)}>
          <div style={{ background: T.surface, borderRadius: 16, padding: isMobile ? 24 : 32, width: isMobile ? '100%' : 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(15,52,96,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>Create Rental Listing</div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 20 }}>Set up a listing and get a shareable application link for prospective tenants.</div>

            {/* Property selector or manual entry */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Property Address *</label>
              {properties.length > 0 ? (
                <select style={input} value={form.property_address}
                  onChange={e => {
                    const prop = properties.find(p => p.address === e.target.value);
                    setForm(f => ({ ...f, property_address: e.target.value, rent: prop?.current_rent?.toString() || f.rent, beds: prop?.beds?.toString() || f.beds, baths: prop?.baths?.toString() || f.baths }));
                  }}>
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.address} value={p.address}>{p.address}</option>)}
                </select>
              ) : (
                <input style={input} value={form.property_address} placeholder="123 Main St, City, State"
                  onChange={e => setForm(f => ({ ...f, property_address: e.target.value }))} />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Rent ($/mo)</label>
                <input style={input} type="number" value={form.rent} placeholder="2400"
                  onChange={e => setForm(f => ({ ...f, rent: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Beds</label>
                <input style={input} type="number" value={form.beds} placeholder="2"
                  onChange={e => setForm(f => ({ ...f, beds: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Baths</label>
                <input style={input} type="number" value={form.baths} placeholder="1"
                  onChange={e => setForm(f => ({ ...f, baths: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Available Date</label>
              <input style={input} type="date" value={form.available_date}
                onChange={e => setForm(f => ({ ...f, available_date: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description (optional)</label>
              <textarea style={{ ...input, minHeight: 70, resize: 'vertical' as const }} value={form.description}
                placeholder="Describe the property, parking, amenities, nearby…"
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Field picker */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Application Fields</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {FIELD_OPTIONS.map(f => {
                  const active = form.required_fields.includes(f.id);
                  return (
                    <button key={f.id} onClick={() => toggleField(f.id)}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: f.required ? 'default' : 'pointer', fontFamily: 'inherit',
                        background: active ? T.tealLight : T.bg,
                        color: active ? T.tealDark : T.inkMuted,
                        border: `1px solid ${active ? T.teal + '66' : T.border}`,
                        opacity: f.required ? 0.8 : 1,
                      }}>
                      {active ? '✓ ' : ''}{f.label}{f.required ? ' *' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={createListing} disabled={saving} style={{ ...btn.primary }}>
                {saving ? 'Creating…' : 'Create Listing'}
              </button>
              <button onClick={() => setShowCreate(false)} style={{ ...btn.ghost }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
