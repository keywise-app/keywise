'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const N = '#0F3460';
const TEAL = '#00D4AA';
const TEAL_DARK = '#00A886';
const BG = '#F0F4FF';
const BORDER = '#E0E6F0';
const INK = '#1A1A2E';
const INK_MID = '#4A5068';
const INK_MUTED = '#8892A4';

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: `1.5px solid ${BORDER}`, borderRadius: 10,
  padding: '11px 14px', fontSize: 14, color: INK,
  fontFamily: 'inherit', outline: 'none', background: '#fff',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: INK_MUTED, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.4px',
  display: 'block', marginBottom: 5,
};

const FIELD_CONFIG: Record<string, { label: string; type: string; placeholder: string; required?: boolean }> = {
  name: { label: 'Full Legal Name', type: 'text', placeholder: 'John Smith', required: true },
  email: { label: 'Email Address', type: 'email', placeholder: 'you@email.com', required: true },
  phone: { label: 'Phone Number', type: 'tel', placeholder: '(555) 123-4567' },
  current_address: { label: 'Current Address', type: 'text', placeholder: '123 Main St, City, State' },
  employer: { label: 'Current Employer', type: 'text', placeholder: 'Company name' },
  job_title: { label: 'Job Title', type: 'text', placeholder: 'Your position' },
  income: { label: 'Monthly Income ($)', type: 'number', placeholder: '5000' },
  move_in_date: { label: 'Desired Move-In Date', type: 'date', placeholder: '' },
  reason_for_moving: { label: 'Reason for Moving', type: 'text', placeholder: 'Why are you looking for a new place?' },
  num_occupants: { label: 'Number of Occupants', type: 'number', placeholder: '2' },
  pets: { label: 'Pets (type and number)', type: 'text', placeholder: 'e.g. 1 cat, no dogs' },
  vehicles: { label: 'Number of Vehicles', type: 'number', placeholder: '1' },
  landlord_reference_name: { label: 'Previous Landlord Name', type: 'text', placeholder: 'Landlord name' },
  landlord_reference_phone: { label: 'Previous Landlord Phone', type: 'tel', placeholder: '(555) 000-0000' },
  emergency_contact: { label: 'Emergency Contact Name & Phone', type: 'text', placeholder: 'Name — (555) 000-0000' },
  additional_info: { label: 'Additional Information', type: 'text', placeholder: 'Anything else you would like us to know' },
};

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
};

export default function ApplyPage() {
  const params = useParams();
  const listingId = params?.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!listingId) return;
    (async () => {
      try {
        // Use Supabase client directly since this is a public page
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data, error } = await supabase
          .from('rental_listings')
          .select('*')
          .eq('id', listingId)
          .eq('status', 'active')
          .single();
        if (error || !data) { setNotFound(true); }
        else { setListing(data); }
      } catch { setNotFound(true); }
      setLoadingListing(false);
    })();
  }, [listingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { setError('Name and email are required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/rental-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_application', listing_id: listingId, applicant_data: form }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setSubmitted(true); }
    } catch { setError('Failed to submit. Please try again.'); }
    setSubmitting(false);
  };

  if (loadingListing) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ color: INK_MUTED, fontSize: 14 }}>Loading application...</div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🏠</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: N, marginBottom: 8 }}>Listing not found</div>
        <div style={{ color: INK_MUTED, fontSize: 14, marginBottom: 24 }}>This listing may have been closed or the link is invalid.</div>
        <Link href="/" style={{ color: TEAL_DARK, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>← Go to Keywise</Link>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E8F8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 22, color: N, marginBottom: 8 }}>Application Submitted</div>
        <div style={{ color: INK_MID, fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
          Thank you for applying for <strong>{listing?.property_address}</strong>. The landlord will review your application and reach out directly.
        </div>
        <div style={{ color: INK_MUTED, fontSize: 13 }}>You can close this page.</div>
      </div>
    </div>
  );

  const fields = listing?.required_fields || ['name', 'email', 'phone'];

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: N, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill={N} />
          <circle cx="13" cy="16" r="5.5" fill="none" stroke={TEAL} strokeWidth="2.5" />
          <circle cx="13" cy="16" r="2" fill={TEAL} />
          <rect x="17.5" y="14.75" width="8" height="2.5" rx="1.25" fill={TEAL} />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Keywise</span>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 20px 60px' }}>
        {/* Property info */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: `1px solid ${BORDER}`, marginBottom: 24, boxShadow: '0 1px 4px rgba(15,52,96,0.06)' }}>
          <div style={{ fontSize: 12, color: TEAL_DARK, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Rental Application</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: N, marginBottom: 8 }}>{listing?.property_address}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14, color: INK_MID }}>
            {listing?.rent ? <span>${listing.rent.toLocaleString()}/mo</span> : null}
            {listing?.beds ? <span>{listing.beds} bed</span> : null}
            {listing?.baths ? <span>{listing.baths} bath</span> : null}
            {listing?.available_date ? <span>Available {listing.available_date}</span> : null}
          </div>
          {listing?.description && (
            <div style={{ fontSize: 14, color: INK_MID, lineHeight: 1.6, marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
              {listing.description}
            </div>
          )}
        </div>

        {/* Application form */}
        <form onSubmit={handleSubmit}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(15,52,96,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: N, marginBottom: 20 }}>Your Information</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {fields.map(fieldId => {
                const config = FIELD_CONFIG[fieldId];
                if (!config) return null;
                return (
                  <div key={fieldId}>
                    <label style={labelStyle}>{config.label}{config.required ? ' *' : ''}</label>
                    {fieldId === 'reason_for_moving' || fieldId === 'additional_info' ? (
                      <textarea
                        value={form[fieldId] || ''}
                        onChange={e => setForm(f => ({ ...f, [fieldId]: e.target.value }))}
                        placeholder={config.placeholder}
                        required={config.required}
                        style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }}
                      />
                    ) : (
                      <input
                        type={config.type}
                        value={form[fieldId] || ''}
                        onChange={e => setForm(f => ({ ...f, [fieldId]: e.target.value }))}
                        placeholder={config.placeholder}
                        required={config.required}
                        style={inputStyle}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={{ background: '#FFF0F0', border: '1px solid #FF6B6B33', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#FF6B6B', marginTop: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              style={{ width: '100%', marginTop: 20, padding: '14px', background: N, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit' }}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: INK_MUTED }}>
          Powered by <a href="https://keywise.app" style={{ color: TEAL_DARK, textDecoration: 'none', fontWeight: 600 }}>Keywise</a> — Property management for landlords
        </div>
      </div>
    </div>
  );
}
