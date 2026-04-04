'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

type Document = {
  id: string;
  property: string;
  tenant_name: string;
  lease_id: string;
  name: string;
  type: string;
  ownership_level: string;
  file_url: string;
  file_path: string;
  summary: string;
  expiry_date: string;
  notes: string;
  size: string;
  created_at: string;
  signed_at?: string;
  signer_name?: string;
  signature_type?: string;
  requires_signature?: boolean;
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

const DOC_TYPES = {
  lease: { label: 'Lease Agreement', icon: '📄', color: '#1A472A', bg: '#D8EDDF' },
  insurance_renters: { label: "Renter's Insurance", icon: '🛡️', color: '#1A5276', bg: '#D6EAF8' },
  insurance_property: { label: 'Property Insurance', icon: '🏠', color: '#1A5276', bg: '#D6EAF8' },
  inspection: { label: 'Inspection Report', icon: '🔍', color: '#D4701A', bg: '#FEF0E4' },
  move_in: { label: 'Move-In Checklist', icon: '📋', color: '#D4701A', bg: '#FEF0E4' },
  move_out: { label: 'Move-Out Checklist', icon: '📦', color: '#D4701A', bg: '#FEF0E4' },
  improvement: { label: 'Capital Improvement', icon: '🏗️', color: '#7D3C98', bg: '#E8DAEF' },
  repair_receipt: { label: 'Repair Receipt', icon: '🔧', color: '#D4701A', bg: '#FEF0E4' },
  tax: { label: 'Tax Document', icon: '💰', color: '#7D3C98', bg: '#E8DAEF' },
  mortgage: { label: 'Mortgage Document', icon: '🏦', color: '#7D3C98', bg: '#E8DAEF' },
  hoa: { label: 'HOA Document', icon: '🏘️', color: '#7D3C98', bg: '#E8DAEF' },
  id: { label: 'Tenant ID', icon: '🪪', color: '#C0392B', bg: '#FDECEA' },
  other: { label: 'Other', icon: '📎', color: '#8C8070', bg: '#F7F5F0' },
};

const OWNERSHIP_LEVELS = [
  { id: 'tenant', label: '👤 Tenant / Lease', desc: "Renter's insurance, signed lease, tenant ID" },
  { id: 'property', label: '🏠 Property', desc: 'Property insurance, inspection reports, mortgage' },
  { id: 'portfolio', label: '📁 Portfolio', desc: 'LLC docs, tax returns, general contracts' },
];

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [properties, setProperties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aiFlags, setAiFlags] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [signingDoc, setSigningDoc] = useState<Document | null>(null);
  const [signingForm, setSigningForm] = useState({ lease_id: '', tenant_email: '', tenant_name: '' });
  const [signingSending, setSigningSending] = useState(false);
  const [signingSent, setSigningSent] = useState<string | null>(null);
  const [landlordProfile, setLandlordProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const emptyForm = {
    name: '', type: 'lease', ownership_level: 'tenant',
    property: '', tenant_name: '', lease_id: '',
    expiry_date: '', notes: '',
  };
  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [docsRes, leasesRes, propsRes, profRes] = await Promise.all([
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
      supabase.from('leases').select('id, tenant_name, property, email').order('tenant_name'),
      supabase.from('properties').select('address'),
      user ? supabase.from('profiles').select('full_name, email').eq('id', user.id).single() : Promise.resolve({ data: null }),
    ]);
    if (docsRes.data) setDocuments(docsRes.data);
    if (leasesRes.data) setLeases(leasesRes.data);
    if (propsRes.data) setProperties(propsRes.data.map(p => p.address));
    if (profRes.data) setLandlordProfile(profRes.data);
    setLoading(false);
  };

  const sendSigningLink = async () => {
    if (!signingDoc) return;
    const lease = leases.find(l => l.id === signingForm.lease_id);
    const tenantEmail = signingForm.tenant_email || lease?.email || '';
    const tenantName = signingForm.tenant_name || lease?.tenant_name || signingDoc.tenant_name || '';
    if (!tenantEmail) { alert('Please enter a tenant email address.'); return; }
    setSigningSending(true);
    const res = await fetch('/api/signing-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: signingDoc.id,
        lease_id: signingForm.lease_id || signingDoc.lease_id || null,
        tenant_email: tenantEmail,
        tenant_name: tenantName,
        document_name: signingDoc.name,
        landlord_name: landlordProfile?.full_name || '',
        landlord_email: landlordProfile?.email || '',
      }),
    });
    const data = await res.json();
    setSigningSending(false);
    if (data.error) { alert('Error: ' + data.error); return; }
    setSigningSent(tenantEmail);
    await fetchAll();
    setTimeout(() => { setSigningDoc(null); setSigningSent(null); }, 3000);
  };

  const uploadFile = async (file: File): Promise<{ path: string } | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = user.id + '/' + Date.now() + '.' + ext;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) { alert('Upload error: ' + error.message); return null; }
    return { path };
  };

  const getSignedUrl = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 3600);
    if (error || !data) return '';
    return data.signedUrl;
  };

  const saveDocument = async () => {
    if (!form.name) { alert('Please enter a document name.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    let file_path = '';
    let size = '';

    if (selectedFile) {
      setUploading(true);
      const uploaded = await uploadFile(selectedFile);
      setUploading(false);
      if (!uploaded) { setSaving(false); return; }
      file_path = uploaded.path;
      size = (selectedFile.size / 1024).toFixed(0) + ' KB';
    }

    const { error } = await supabase.from('documents').insert({
      user_id: user.id,
      name: form.name || 'Untitled Document',
      type: form.type || 'other',
      ownership_level: form.ownership_level || 'portfolio',
      property: form.property || '',
      tenant_name: form.tenant_name || '',
      lease_id: form.lease_id || null,
      expiry_date: form.expiry_date || null,
      notes: form.notes || '',
      file_url: '',
      file_path,
      size,
    });

    if (error) {
      console.error('Document insert error:', error);
      alert('Error saving document: ' + error.message + (error.code ? ' | Code: ' + error.code : ''));
    } else {
      await fetchAll();
      setShowAdd(false);
      setForm(emptyForm);
      setSelectedFile(null);
    }
    setSaving(false);
  };

  const saveDocEdit = async () => {
    if (!editingDoc) return;
    setEditSaving(true);
    const { error } = await supabase.from('documents').update({
      name: editForm.name,
      type: editForm.type,
      ownership_level: editForm.ownership_level,
      property: editForm.property,
      tenant_name: editForm.tenant_name,
      expiry_date: editForm.expiry_date || null,
      notes: editForm.notes,
    }).eq('id', editingDoc.id);
    if (error) {
      alert('Error saving: ' + error.message);
    } else {
      await fetchAll();
      setEditingDoc(null);
      setEditForm(null);
    }
    setEditSaving(false);
  };

  const summarizeDoc = async (doc: Document) => {
    if (!doc.file_path) { alert('No file attached to summarize.'); return; }
    setSummarizing(doc.id);
    try {
      const signedUrl = await getSignedUrl(doc.file_path);
      if (!signedUrl) { alert('Could not access file.'); setSummarizing(null); return; }
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const res = await fetch('/api/summarize-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, fileType: blob.type, mode: 'summarize' }),
      });
      const data = await res.json();
      const summary = data.result || 'Could not summarize.';
      await supabase.from('documents').update({ summary }).eq('id', doc.id);
      setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, summary } : d));
    } catch (err) {
      alert('Could not summarize document.');
    }
    setSummarizing(null);
  };

  const checkInsurance = async (doc: Document) => {
    if (!doc.file_path) { alert('No file attached.'); return; }
    setChecking(doc.id);
    try {
      const signedUrl = await getSignedUrl(doc.file_path);
      if (!signedUrl) { alert('Could not access file.'); setChecking(null); return; }
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const res = await fetch('/api/summarize-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, fileType: blob.type, mode: 'insurance' }),
      });
      const data = await res.json();
      const summary = data.result || 'Could not check insurance.';
      await supabase.from('documents').update({ summary }).eq('id', doc.id);
      setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, summary } : d));
    } catch (err) {
      alert('Could not check insurance document.');
    }
    setChecking(null);
  };

  const checkMissingDocs = async () => {
    setFlagging(true);
    setAiFlags('');
    const docSummary = leases.map(l => {
      const tenantDocs = documents.filter(d => d.tenant_name === l.tenant_name || d.lease_id === l.id);
      return l.tenant_name + ' at ' + l.property + ': ' + (tenantDocs.length === 0 ? 'NO DOCUMENTS' : tenantDocs.map(d => d.type).join(', '));
    }).join('\n');
    const propDocs = properties.map(p => {
      const pDocs = documents.filter(d => d.property === p && d.ownership_level === 'property');
      return p + ': ' + (pDocs.length === 0 ? 'NO DOCUMENTS' : pDocs.map(d => d.type).join(', '));
    }).join('\n');
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Review this landlord\'s document inventory and flag anything missing or concerning:\n\nTenant Documents:\n' + docSummary + '\n\nProperty Documents:\n' + propDocs + '\n\nFor each tenant check: signed lease, renters insurance, move-in checklist.\nFor each property check: property insurance, inspection report.\nFlag expiring documents and critical gaps. Be specific about what\'s missing and why it matters legally or financially.',
      }),
    });
    const data = await res.json();
    setAiFlags(data.result);
    setFlagging(false);
  };

  const removeDoc = async (doc: Document) => {
    if (!confirm('Remove this document?')) return;
    if (doc.file_path) {
      await supabase.storage.from('documents').remove([doc.file_path]);
    }
    await supabase.from('documents').delete().eq('id', doc.id);
    setDocuments(documents.filter(d => d.id !== doc.id));
  };

  const isExpiringSoon = (expiry: string) => {
    if (!expiry) return false;
    const days = Math.ceil((new Date(expiry).getTime() - new Date().getTime()) / 86400000);
    return days <= 60 && days > 0;
  };

  const isExpired = (expiry: string) => {
    if (!expiry) return false;
    return new Date(expiry) < new Date();
  };

  const expiringDocs = documents.filter(d => isExpiringSoon(d.expiry_date) || isExpired(d.expiry_date));
  const filtered = documents.filter(d => {
    const typeMatch = filter === 'all' || d.type === filter;
    const ownerMatch = ownershipFilter === 'all' || d.ownership_level === ownershipFilter;
    return typeMatch && ownerMatch;
  });

  const docType = (type: string) => DOC_TYPES[type as keyof typeof DOC_TYPES] || DOC_TYPES.other;

  return (
    <div>
      {/* Expiry alerts */}
      {expiringDocs.length > 0 && (
        <div style={{ background: '#FDECEA', border: '1px solid #C0392B33', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#C0392B', marginBottom: 6 }}>⚠️ Document Alerts</div>
          {expiringDocs.map(d => (
            <div key={d.id} style={{ fontSize: 13, color: '#4A4A4A', marginBottom: 2 }}>
              {isExpired(d.expiry_date) ? '🔴 EXPIRED' : '🟡 Expiring soon'}: {d.name}
              {d.tenant_name && ' — ' + d.tenant_name}
              {d.property && ' · ' + d.property.split(',')[0]}
              {d.expiry_date && ' · ' + d.expiry_date}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Documents', value: documents.length, color: '#1C1C1C' },
          { label: 'Tenant Docs', value: documents.filter(d => d.ownership_level === 'tenant').length, color: '#1A472A' },
          { label: 'Property Docs', value: documents.filter(d => d.ownership_level === 'property').length, color: '#1A5276' },
          { label: 'Expiring Soon', value: expiringDocs.length, color: expiringDocs.length > 0 ? '#C0392B' : '#8C8070' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#8C8070', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* AI Check */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={checkMissingDocs} disabled={flagging}
          style={{ background: '#D8EDDF', color: '#1A472A', border: '1px solid #2D6A4F33', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {flagging ? '✦ Checking…' : '✦ AI — Check for Missing Documents'}
        </button>
      </div>

      {aiFlags && (
        <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>✦ Document Gap Analysis</div>
          <div style={{ background: '#D8EDDF', border: '1px solid #2D6A4F33', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{aiFlags}</div>
          <button onClick={() => setAiFlags('')}
            style={{ marginTop: 10, background: '#FDECEA', color: '#C0392B', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setOwnershipFilter('all')}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: ownershipFilter === 'all' ? '#1A472A' : '#F7F5F0', color: ownershipFilter === 'all' ? 'white' : '#4A4A4A', border: '1px solid ' + (ownershipFilter === 'all' ? '#1A472A' : '#E8E3D8') }}>
            All
          </button>
          {OWNERSHIP_LEVELS.map(l => (
            <button key={l.id} onClick={() => setOwnershipFilter(l.id)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: ownershipFilter === l.id ? '#1A472A' : '#F7F5F0', color: ownershipFilter === l.id ? 'white' : '#4A4A4A', border: '1px solid ' + (ownershipFilter === l.id ? '#1A472A' : '#E8E3D8') }}>
              {l.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowAdd(true); setForm(emptyForm); setSelectedFile(null); }}
          style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Upload Document
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#8C8070' }}>Loading documents…</div>}

      {!loading && documents.length === 0 && (
        <div style={{ background: 'white', border: '1px solid #E8E3D8', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No documents yet</div>
          <div style={{ color: '#8C8070', fontSize: 13, marginBottom: 20 }}>Upload leases, insurance certificates, inspection reports and more — all organized by property and tenant.</div>
          <button onClick={() => setShowAdd(true)}
            style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Upload First Document
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        {filtered.map(doc => {
          const dt = docType(doc.type);
          const expired = isExpired(doc.expiry_date);
          const expiring = isExpiringSoon(doc.expiry_date);
          return (
            <div key={doc.id} style={{ background: 'white', border: '1px solid ' + (expired ? '#C0392B55' : expiring ? '#D4701A55' : '#E8E3D8'), borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>{dt.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{doc.name}</div>
                      <span style={{ background: dt.bg, color: dt.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{dt.label}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#8C8070', marginBottom: 6 }}>
                    {doc.ownership_level === 'tenant' && doc.tenant_name && <span>👤 {doc.tenant_name} · </span>}
                    {doc.property && <span>🏠 {doc.property.split(',')[0]}</span>}
                    {!doc.tenant_name && !doc.property && <span>📁 Portfolio</span>}
                  </div>
                  {doc.expiry_date && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: expired ? '#C0392B' : expiring ? '#D4701A' : '#2D6A4F', marginBottom: 6 }}>
                      {expired ? '🔴 Expired' : expiring ? '🟡 Expires' : '✓ Valid until'} {doc.expiry_date}
                    </div>
                  )}
                  {doc.signed_at ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#D8EDDF', color: '#1A472A', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                      ✓ Signed {doc.signed_at.slice(0, 10)}{doc.signer_name ? ` · ${doc.signer_name}` : ''}
                    </div>
                  ) : doc.requires_signature ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FEF0E4', color: '#D4701A', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                      ✍️ Awaiting signature
                    </div>
                  ) : null}
                  {doc.size && <div style={{ fontSize: 11, color: '#8C8070', marginBottom: 6 }}>{doc.size}</div>}
                  {doc.notes && <div style={{ fontSize: 12, color: '#8C8070', fontStyle: 'italic', marginBottom: 6 }}>{doc.notes}</div>}
                  {doc.summary && (
                    <div style={{ background: '#F7F5F0', borderRadius: 8, padding: '10px 12px', marginTop: 8, fontSize: 12, lineHeight: 1.6, color: '#4A4A4A' }}>
                      {doc.summary.slice(0, 200)}{doc.summary.length > 200 ? '…' : ''}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 12 }}>
               {doc.file_path && (
  <button onClick={async () => {
    const win = window.open('', '_blank');
    const url = await getSignedUrl(doc.file_path);
    if (url && win) {
      win.location.href = url;
    } else {
      win?.close();
      alert('Could not generate link.');
    }
  }}
    style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#1C1C1C' }}>
    📄 View
  </button>
)}
                  {doc.file_path && (
                    <button onClick={() => summarizeDoc(doc)} disabled={summarizing === doc.id}
                      style={{ background: '#D8EDDF', color: '#1A472A', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {summarizing === doc.id ? '…' : '✦ Summarize'}
                    </button>
                  )}
                  {doc.file_path && doc.type === 'insurance_renters' && (
                    <button onClick={() => checkInsurance(doc)} disabled={checking === doc.id}
                      style={{ background: '#D6EAF8', color: '#1A5276', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {checking === doc.id ? '…' : '✦ Check'}
                    </button>
                  )}
                  {!doc.signed_at && (
                    <button onClick={() => {
                      setSigningDoc(doc);
                      const lease = leases.find(l => l.id === doc.lease_id);
                      setSigningForm({ lease_id: doc.lease_id || '', tenant_email: (lease as any)?.email || '', tenant_name: doc.tenant_name || lease?.tenant_name || '' });
                    }}
                      style={{ background: '#EAE4FF', color: '#5B21B6', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      ✍️ Sign
                    </button>
                  )}
                  <button onClick={() => {
                    setEditingDoc(doc);
                    setEditForm({
                      name: doc.name, type: doc.type,
                      ownership_level: doc.ownership_level,
                      property: doc.property || '',
                      tenant_name: doc.tenant_name || '',
                      expiry_date: doc.expiry_date || '',
                      notes: doc.notes || '',
                    });
                  }}
                    style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => removeDoc(doc)}
                    style={{ background: '#FDECEA', color: '#C0392B', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setShowAdd(false); setForm(emptyForm); setSelectedFile(null); }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Upload Document</div>
            <div style={{ fontSize: 13, color: '#8C8070', marginBottom: 24 }}>Upload and organize your property documents.</div>

            {/* File upload zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) { setSelectedFile(file); if (!form.name) setForm((f: any) => ({ ...f, name: file.name.replace(/\.[^/.]+$/, '') })); } }}
              onDragOver={e => e.preventDefault()}
              style={{ border: '2px dashed #E8E3D8', borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 20, background: selectedFile ? '#D8EDDF' : 'white' }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }}
                onChange={e => { const file = e.target.files?.[0]; if (file) { setSelectedFile(file); if (!form.name) setForm((f: any) => ({ ...f, name: file.name.replace(/\.[^/.]+$/, '') })); } }} />
              {selectedFile
                ? <div style={{ color: '#1A472A', fontWeight: 600, fontSize: 13 }}>✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</div>
                : <>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1A472A' }}>Drop file here or click to browse</div>
                    <div style={{ fontSize: 12, color: '#8C8070', marginTop: 4 }}>PDF, image, or Word doc</div>
                  </>
              }
            </div>

            {/* Ownership level */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Document Belongs To</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {OWNERSHIP_LEVELS.map(l => (
                  <div key={l.id} onClick={() => setForm({ ...form, ownership_level: l.id })}
                    style={{ padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (form.ownership_level === l.id ? '#1A472A' : '#E8E3D8'), background: form.ownership_level === l.id ? '#D8EDDF' : '#F7F5F0' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: form.ownership_level === l.id ? '#1A472A' : '#1C1C1C' }}>{l.label}</div>
                    <div style={{ fontSize: 11, color: '#8C8070', marginTop: 2 }}>{l.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Document Name</label>
              <input style={inputStyle} value={form.name} placeholder="e.g. Sarah Chen — Renter's Insurance 2025"
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Document Type</label>
              <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {Object.entries(DOC_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
            </div>

            {(form.ownership_level === 'tenant' || form.ownership_level === 'property') && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Property</label>
                {properties.length > 0 ? (
                  <select style={inputStyle} value={form.property} onChange={e => setForm({ ...form, property: e.target.value })}>
                    <option value="">Select property…</option>
                    {properties.map(p => <option key={p}>{p}</option>)}
                  </select>
                ) : (
                  <input style={inputStyle} value={form.property} placeholder="Property address"
                    onChange={e => setForm({ ...form, property: e.target.value })} />
                )}
              </div>
            )}

            {form.ownership_level === 'tenant' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Tenant</label>
                {leases.length > 0 ? (
                  <select style={inputStyle} value={form.lease_id} onChange={e => {
                    const lease = leases.find(l => l.id === e.target.value);
                    setForm({ ...form, lease_id: e.target.value, tenant_name: lease?.tenant_name || '', property: lease?.property || form.property });
                  }}>
                    <option value="">Select tenant…</option>
                    {leases.map(l => <option key={l.id} value={l.id}>{l.tenant_name} — {l.property}</option>)}
                  </select>
                ) : (
                  <input style={inputStyle} value={form.tenant_name} placeholder="Tenant name"
                    onChange={e => setForm({ ...form, tenant_name: e.target.value })} />
                )}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Expiry Date (if applicable)</label>
              <input style={inputStyle} type="date" value={form.expiry_date}
                onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes about this document…"
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'sans-serif' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveDocument} disabled={saving || uploading}
                style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save Document'}
              </button>
              <button onClick={() => { setShowAdd(false); setForm(emptyForm); setSelectedFile(null); }}
                style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingDoc && editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => { setEditingDoc(null); setEditForm(null); }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 520, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Edit Document</div>
            <div style={{ fontSize: 13, color: '#8C8070', marginBottom: 24 }}>{editingDoc.name}</div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Document Name</label>
              <input style={inputStyle} value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Document Type</label>
              <select style={inputStyle} value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                {Object.entries(DOC_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Document Belongs To</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {OWNERSHIP_LEVELS.map(l => (
                  <button key={l.id} onClick={() => setEditForm({ ...editForm, ownership_level: l.id })}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: editForm.ownership_level === l.id ? '#1A472A' : '#F7F5F0',
                      color: editForm.ownership_level === l.id ? 'white' : '#4A4A4A',
                      border: '1px solid ' + (editForm.ownership_level === l.id ? '#1A472A' : '#E8E3D8'),
                    }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {(editForm.ownership_level === 'tenant' || editForm.ownership_level === 'property') && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Property</label>
                {properties.length > 0 ? (
                  <select style={inputStyle} value={editForm.property} onChange={e => setEditForm({ ...editForm, property: e.target.value })}>
                    <option value="">Select property…</option>
                    {properties.map(p => <option key={p}>{p}</option>)}
                  </select>
                ) : (
                  <input style={inputStyle} value={editForm.property}
                    onChange={e => setEditForm({ ...editForm, property: e.target.value })} />
                )}
              </div>
            )}

            {editForm.ownership_level === 'tenant' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Tenant</label>
                {leases.length > 0 ? (
                  <select style={inputStyle} value={editForm.tenant_name} onChange={e => setEditForm({ ...editForm, tenant_name: e.target.value })}>
                    <option value="">Select tenant…</option>
                    {leases.map(l => <option key={l.id} value={l.tenant_name}>{l.tenant_name}</option>)}
                  </select>
                ) : (
                  <input style={inputStyle} value={editForm.tenant_name}
                    onChange={e => setEditForm({ ...editForm, tenant_name: e.target.value })} />
                )}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Expiry Date</label>
              <input style={inputStyle} type="date" value={editForm.expiry_date}
                onChange={e => setEditForm({ ...editForm, expiry_date: e.target.value })} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Notes</label>
              <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'sans-serif' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveDocEdit} disabled={editSaving}
                style={{ background: '#1A472A', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => { setEditingDoc(null); setEditForm(null); }}
                style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send for Signature Modal */}
      {signingDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setSigningDoc(null); }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 480, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Send for Signature</div>
              <button onClick={() => setSigningDoc(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#8C8070', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: '#8C8070', marginBottom: 24 }}>📄 {signingDoc.name}</div>

            {signingSent ? (
              <div style={{ background: '#D8EDDF', border: '1px solid #1A472A33', borderRadius: 10, padding: '16px 20px', fontSize: 14, fontWeight: 600, color: '#1A472A', textAlign: 'center' }}>
                ✓ Signing link sent to {signingSent}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Tenant</label>
                  <select style={inputStyle} value={signingForm.lease_id} onChange={e => {
                    const lease = leases.find(l => l.id === e.target.value);
                    setSigningForm({ lease_id: e.target.value, tenant_email: (lease as any)?.email || '', tenant_name: lease?.tenant_name || '' });
                  }}>
                    <option value="">Select tenant…</option>
                    {leases.map(l => <option key={l.id} value={l.id}>{l.tenant_name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Tenant Email</label>
                  <input style={inputStyle} type="email" placeholder="tenant@email.com" value={signingForm.tenant_email}
                    onChange={e => setSigningForm({ ...signingForm, tenant_email: e.target.value })} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Tenant Name</label>
                  <input style={inputStyle} placeholder="Full name" value={signingForm.tenant_name}
                    onChange={e => setSigningForm({ ...signingForm, tenant_name: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={sendSigningLink} disabled={signingSending || !signingForm.tenant_email}
                    style={{ background: '#5B21B6', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: signingSending || !signingForm.tenant_email ? 0.6 : 1 }}>
                    {signingSending ? 'Sending…' : '✍️ Send Signing Link'}
                  </button>
                  <button onClick={() => setSigningDoc(null)}
                    style={{ background: '#F7F5F0', border: '1px solid #E8E3D8', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}