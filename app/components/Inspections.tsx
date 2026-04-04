'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { T, input, label, btn } from '../lib/theme';

type Room = {
  name: string;
  condition: string;
  notes: string;
  photos: { id?: string; path: string; url: string; caption: string }[];
};

type Inspection = {
  id: string;
  created_at: string;
  type: string;
  status: string;
  rooms: Room[];
  overall_condition: string;
  notes: string;
  completed_at: string | null;
  report_url: string | null;
  report_text: string | null;
  tenant_name: string;
  property: string;
  landlord_signature: string | null;
  landlord_signed_at: string | null;
  tenant_signature: string | null;
  tenant_signed_at: string | null;
};

const DEFAULT_ROOMS = [
  'Living Room', 'Kitchen', 'Master Bedroom', 'Bedroom 2',
  'Bathroom 1', 'Bathroom 2', 'Hallway', 'Garage', 'Outdoor/Patio', 'Basement',
];

const CONDITIONS = [
  { value: 'Excellent', color: T.greenDark, bg: '#E8F8F0' },
  { value: 'Good', color: T.teal, bg: T.tealLight },
  { value: 'Fair', color: '#9A6500', bg: '#FFF8E0' },
  { value: 'Poor', color: T.coral, bg: '#FFF0F0' },
];

export default function Inspections({ lease, onClose }: { lease: any; onClose?: () => void }) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'list' | 'setup' | 'rooms' | 'summary' | 'report' | 'sign'>('list');
  const [inspectionType, setInspectionType] = useState<'move_in' | 'move_out'>('move_in');
  const [selectedRooms, setSelectedRooms] = useState<string[]>(['Living Room', 'Kitchen', 'Master Bedroom', 'Bathroom 1']);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState(0);
  const [overallCondition, setOverallCondition] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [report, setReport] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingInspection, setViewingInspection] = useState<Inspection | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [landlordSigName, setLandlordSigName] = useState('');
  const [signing, setSigning] = useState(false);
  const [sendingToTenant, setSendingToTenant] = useState(false);
  const [sentToTenant, setSentToTenant] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { fetchInspections(); }, []);

  const fetchInspections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inspections')
      .select('*')
      .eq('lease_id', lease.id)
      .order('created_at', { ascending: false });
    setInspections((data as Inspection[]) || []);
    setLoading(false);
  };

  const startInspection = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const roomList: Room[] = selectedRooms.map(name => ({ name, condition: '', notes: '', photos: [] }));
    const { data, error } = await supabase.from('inspections').insert({
      user_id: user.id,
      lease_id: lease.id,
      tenant_name: lease.tenant_name,
      property: lease.property,
      type: inspectionType,
      status: 'in_progress',
      rooms: roomList,
    }).select().single();
    if (error) { alert('Error: ' + error.message); return; }
    setInspectionId(data.id);
    setRooms(roomList);
    setCurrentRoom(0);
    setStep('rooms');
  };

  const updateRoom = (field: keyof Room, value: any) => {
    setRooms(prev => prev.map((r, i) => i === currentRoom ? { ...r, [field]: value } : r));
  };

  const uploadPhoto = async (file: File) => {
    if (!inspectionId) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const room = rooms[currentRoom];
    const ext = file.name.split('.').pop();
    const path = `${user?.id}/${inspectionId}/${room.name.replace(/\s+/g, '_')}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) { alert('Upload failed: ' + error.message); setUploading(false); return; }
    const { data: urlData } = await supabase.storage.from('documents').createSignedUrl(path, 86400 * 365);
    const photo = { path, url: urlData?.signedUrl || '', caption: '' };
    updateRoom('photos', [...room.photos, photo]);
    // Save photo record
    await supabase.from('inspection_photos').insert({
      inspection_id: inspectionId,
      room_name: room.name,
      photo_path: path,
      photo_url: urlData?.signedUrl || '',
      caption: '',
    });
    setUploading(false);
  };

  const removePhoto = async (photoIndex: number) => {
    const room = rooms[currentRoom];
    const photo = room.photos[photoIndex];
    if (photo.path) {
      await supabase.storage.from('documents').remove([photo.path]);
    }
    if (photo.id) {
      await supabase.from('inspection_photos').delete().eq('id', photo.id);
    }
    updateRoom('photos', room.photos.filter((_, i) => i !== photoIndex));
  };

  const saveProgress = async () => {
    if (!inspectionId) return;
    await supabase.from('inspections').update({ rooms }).eq('id', inspectionId);
  };

  const goToSummary = async () => {
    await saveProgress();
    setStep('summary');
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-inspection-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: inspectionType,
          property: lease.property,
          tenant_name: lease.tenant_name,
          date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          rooms: rooms.map(r => ({ name: r.name, condition: r.condition, notes: r.notes, photoCount: r.photos.length })),
          overall_condition: overallCondition,
          notes: generalNotes,
        }),
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setStep('report');
      } else {
        alert('Failed to generate report');
      }
    } catch { alert('Error generating report'); }
    setGenerating(false);
  };

  const deleteInspection = async (id: string) => {
    if (!confirm('Delete this inspection? This cannot be undone.')) return;
    const { data: photos } = await supabase.from('inspection_photos').select('photo_path').eq('inspection_id', id);
    if (photos && photos.length > 0) {
      const paths = photos.map(p => p.photo_path).filter(Boolean);
      if (paths.length > 0) await supabase.storage.from('documents').remove(paths);
    }
    await supabase.from('signing_tokens').delete().eq('inspection_id', id);
    await supabase.from('inspection_photos').delete().eq('inspection_id', id);
    const { error } = await supabase.from('inspections').delete().eq('id', id);
    if (error) { alert('Error deleting: ' + error.message); return; }
    if (viewingInspection?.id === id) setViewingInspection(null);
    fetchInspections();
  };

  const saveReportAndSign = async () => {
    if (!inspectionId) return;
    setSaving(true);
    await supabase.from('inspections').update({
      rooms,
      overall_condition: overallCondition,
      notes: generalNotes,
      report_text: report,
      status: 'awaiting_signatures',
      completed_at: new Date().toISOString(),
    }).eq('id', inspectionId);
    setSaving(false);
    setStep('sign');
  };

  const signAsLandlord = async () => {
    if (!inspectionId || !landlordSigName.trim()) return;
    setSigning(true);
    await supabase.from('inspections').update({
      landlord_signature: landlordSigName.trim(),
      landlord_signed_at: new Date().toISOString(),
      status: 'landlord_signed',
    }).eq('id', inspectionId);
    // Save as document
    const { data: { user } } = await supabase.auth.getUser();
    if (user && report) {
      await supabase.from('documents').insert({
        user_id: user.id,
        name: `${inspectionType === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection — ${lease.tenant_name}`,
        type: inspectionType === 'move_in' ? 'move_in' : 'move_out',
        ownership_level: 'tenant',
        property: lease.property,
        tenant_name: lease.tenant_name,
        lease_id: lease.id,
        summary: report.slice(0, 500),
        file_url: '', file_path: '',
        size: '',
      });
    }
    setSigning(false);
    await fetchInspections();
  };

  const sendToTenantForSignature = async () => {
    if (!inspectionId || !lease.email) return;
    setSendingToTenant(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/signing-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          document_id: inspectionId,
          inspection_id: inspectionId,
          lease_id: lease.id,
          tenant_email: lease.email,
          tenant_name: lease.tenant_name,
          document_name: `${inspectionType === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection Report`,
          landlord_name: '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSentToTenant(true);
      } else {
        alert('Failed to send: ' + (data.error || 'Unknown error'));
      }
    } catch { alert('Error sending to tenant'); }
    setSendingToTenant(false);
  };

  const conditionBadge = (c: string) => {
    const cfg = CONDITIONS.find(x => x.value === c) || { color: T.inkMuted, bg: T.bg };
    return { background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 as const, padding: '2px 8px', borderRadius: 20 };
  };

  // ── LIST VIEW ──
  if (step === 'list') {
    if (viewingInspection) {
      const vi = viewingInspection;
      return (
        <div>
          <button onClick={() => setViewingInspection(null)} style={{ background: 'none', border: 'none', color: T.navy, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px' }}>← Back to inspections</button>
          <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>
            {vi.type === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection
          </div>
          <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>{vi.property} — {new Date(vi.created_at).toLocaleDateString()}</div>
          {vi.overall_condition && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: T.inkMuted, fontWeight: 600 }}>Overall: </span>
              <span style={conditionBadge(vi.overall_condition)}>{vi.overall_condition}</span>
            </div>
          )}
          {(vi.rooms || []).map((r: Room, i: number) => (
            <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>{r.name}</div>
                {r.condition && <span style={conditionBadge(r.condition)}>{r.condition}</span>}
              </div>
              {r.notes && <div style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.6 }}>{r.notes}</div>}
              {r.photos?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {r.photos.map((p, j) => (
                    <img key={j} src={p.url} alt={p.caption || r.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {vi.notes && (
            <div style={{ background: T.tealLight, border: `1px solid ${T.teal}33`, borderRadius: T.radiusSm, padding: 14, marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.tealDark, textTransform: 'uppercase', marginBottom: 6 }}>General Notes</div>
              <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6 }}>{vi.notes}</div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>Inspections</div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => { setInspectionType('move_in'); setStep('setup'); }}
            style={{ ...btn.primary, fontSize: 12, padding: '8px 16px' }}>
            + Move-In Inspection
          </button>
          <button onClick={() => { setInspectionType('move_out'); setStep('setup'); }}
            style={{ ...btn.ghost, fontSize: 12, padding: '8px 16px' }}>
            + Move-Out Inspection
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: T.inkMuted, fontSize: 13 }}>Loading...</div>
        ) : inspections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: T.inkMuted, fontSize: 13 }}>
            No inspections yet. Start one to document the property condition.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inspections.map(ins => (
              <div key={ins.id} onClick={() => setViewingInspection(ins)}
                style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 14, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: ins.type === 'move_in' ? T.tealLight : '#FFF0F0', color: ins.type === 'move_in' ? T.tealDark : T.coral, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>
                      {ins.type === 'move_in' ? 'Move-In' : 'Move-Out'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
                      {new Date(ins.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {ins.overall_condition && <span style={conditionBadge(ins.overall_condition)}>{ins.overall_condition}</span>}
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      color: ins.tenant_signed_at ? T.greenDark : ins.landlord_signed_at ? '#9A6500' : ins.status === 'completed' || ins.status === 'awaiting_signatures' || ins.status === 'landlord_signed' ? '#9A6500' : T.inkMuted }}>
                      {ins.tenant_signed_at ? '✓ Fully Signed' : ins.landlord_signed_at ? '⏳ Awaiting Tenant' : ins.status === 'in_progress' ? 'In Progress' : '✓ Complete'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: T.inkMuted }}>{(ins.rooms || []).length} rooms inspected</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteInspection(ins.id); }}
                    style={{ ...btn.danger, fontSize: 11, padding: '4px 10px' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── SETUP ──
  if (step === 'setup') {
    return (
      <div>
        <button onClick={() => setStep('list')} style={{ background: 'none', border: 'none', color: T.navy, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px' }}>← Back</button>
        <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 4 }}>
          {inspectionType === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection
        </div>
        <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 20 }}>
          {lease.tenant_name} — {lease.property}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>
            Rooms to Inspect
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEFAULT_ROOMS.map(room => {
              const selected = selectedRooms.includes(room);
              return (
                <button key={room} onClick={() => {
                  setSelectedRooms(prev => selected ? prev.filter(r => r !== room) : [...prev, room]);
                }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: T.radiusSm, border: `1.5px solid ${selected ? T.teal : T.border}`, background: selected ? T.tealLight : T.surface, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: selected ? T.teal : T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {selected ? '✓' : ''}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: selected ? T.navy : T.inkMid }}>{room}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={startInspection} disabled={selectedRooms.length === 0}
          style={{ ...btn.primary, width: '100%', padding: '14px', fontSize: 15, borderRadius: 10, opacity: selectedRooms.length === 0 ? 0.5 : 1 }}>
          Start Inspection ({selectedRooms.length} rooms) →
        </button>
      </div>
    );
  }

  // ── ROOM BY ROOM ──
  if (step === 'rooms') {
    const room = rooms[currentRoom];
    const progress = ((currentRoom + 1) / rooms.length) * 100;

    return (
      <div>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: T.teal, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: T.inkMuted, fontWeight: 600, flexShrink: 0 }}>
            Room {currentRoom + 1} of {rooms.length}
          </span>
        </div>

        <div style={{ fontWeight: 700, fontSize: 20, color: T.navy, marginBottom: 16 }}>{room.name}</div>

        {/* Condition selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Condition</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 8 }}>
            {CONDITIONS.map(c => {
              const active = room.condition === c.value;
              return (
                <button key={c.value} onClick={() => updateRoom('condition', c.value)}
                  style={{
                    padding: isMobile ? '16px 8px' : '14px 8px', minHeight: isMobile ? 64 : 60, borderRadius: T.radiusSm, cursor: 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${active ? c.color : T.border}`,
                    background: active ? c.bg : T.surface,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: isMobile ? 22 : 18 }}>
                    {c.value === 'Excellent' ? '🌟' : c.value === 'Good' ? '👍' : c.value === 'Fair' ? '⚠️' : '🔴'}
                  </span>
                  <span style={{ fontSize: isMobile ? 13 : 12, fontWeight: 700, color: active ? c.color : T.inkMid }}>{c.value}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Notes</label>
          <textarea value={room.notes} onChange={e => updateRoom('notes', e.target.value)}
            placeholder="Describe any issues, damage, or notable items..."
            style={{ ...input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        {/* Photos */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Photos ({room.photos.length})
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ ...btn.ghost, fontSize: 12, padding: '6px 12px' }}>
              {uploading ? 'Uploading...' : '📷 Add Photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} />
          </div>
          {room.photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 10 }}>
              {room.photos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p.url} alt={p.caption || room.name} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} />
                  <button onClick={() => removePhoto(i)}
                    style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10 }}>
          {currentRoom > 0 && (
            <button onClick={async () => { await saveProgress(); setCurrentRoom(currentRoom - 1); }}
              style={{ ...btn.ghost, flex: 1, padding: '12px' }}>
              ← Previous
            </button>
          )}
          {currentRoom < rooms.length - 1 ? (
            <button onClick={async () => { await saveProgress(); setCurrentRoom(currentRoom + 1); }}
              style={{ ...btn.primary, flex: 1, padding: '12px' }}>
              Next Room →
            </button>
          ) : (
            <button onClick={goToSummary}
              style={{ ...btn.primary, flex: 1, padding: '12px' }}>
              Review Summary →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── SUMMARY ──
  if (step === 'summary') {
    return (
      <div>
        <button onClick={() => { setStep('rooms'); setCurrentRoom(rooms.length - 1); }}
          style={{ background: 'none', border: 'none', color: T.navy, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px' }}>← Back to rooms</button>
        <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 16 }}>Inspection Summary</div>

        {/* Room summary cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {rooms.map((r, i) => (
            <div key={i} onClick={() => { setCurrentRoom(i); setStep('rooms'); }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>{r.name}</div>
                {r.notes && <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{r.notes.slice(0, 60)}{r.notes.length > 60 ? '...' : ''}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {r.photos.length > 0 && <span style={{ fontSize: 11, color: T.inkMuted }}>📷 {r.photos.length}</span>}
                {r.condition ? <span style={conditionBadge(r.condition)}>{r.condition}</span>
                  : <span style={{ fontSize: 11, color: T.coral, fontWeight: 600 }}>Not rated</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Overall condition */}
        <div style={{ marginBottom: 16 }}>
          <label style={label}>Overall Condition</label>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 8 }}>
            {CONDITIONS.map(c => {
              const active = overallCondition === c.value;
              return (
                <button key={c.value} onClick={() => setOverallCondition(c.value)}
                  style={{
                    padding: '10px 8px', minHeight: 44, borderRadius: T.radiusSm, cursor: 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${active ? c.color : T.border}`,
                    background: active ? c.bg : T.surface,
                    fontSize: 12, fontWeight: 700, color: active ? c.color : T.inkMid,
                  }}>
                  {c.value}
                </button>
              );
            })}
          </div>
        </div>

        {/* General notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>General Notes</label>
          <textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)}
            placeholder="Any overall observations or notes..."
            style={{ ...input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        <button onClick={generateReport} disabled={generating}
          style={{ ...btn.primary, width: '100%', padding: '14px', fontSize: 15, borderRadius: 10 }}>
          {generating ? '✦ Generating Report...' : '✦ Generate AI Report'}
        </button>
      </div>
    );
  }

  // ── REPORT ──
  if (step === 'report') {
    return (
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 16 }}>
          {inspectionType === 'move_in' ? 'Move-In' : 'Move-Out'} Inspection Report
        </div>

        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 20, marginBottom: 20, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: T.ink }}>
          {report}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={saveReportAndSign} disabled={saving}
            style={{ ...btn.primary, flex: 1, padding: '12px' }}>
            {saving ? 'Saving...' : 'Continue to Signatures →'}
          </button>
          <button onClick={() => { navigator.clipboard.writeText(report); }}
            style={{ ...btn.ghost, padding: '12px 16px' }}>
            📋 Copy
          </button>
        </div>
      </div>
    );
  }

  // ── SIGN ──
  if (step === 'sign') {
    const currentInspection = inspections.find(i => i.id === inspectionId);
    const landlordSigned = !!currentInspection?.landlord_signed_at;
    const tenantSigned = !!currentInspection?.tenant_signed_at;

    return (
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: T.navy, marginBottom: 16 }}>
          Sign Inspection Report
        </div>

        {/* Status */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, background: landlordSigned ? '#E8F8F0' : T.amberLight, border: `1px solid ${landlordSigned ? T.greenDark : T.amberDark}33`, borderRadius: T.radiusSm, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{landlordSigned ? '✓' : '✍️'}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: landlordSigned ? T.greenDark : T.amberDark }}>
              {landlordSigned ? 'Landlord Signed' : 'Awaiting Landlord'}
            </div>
          </div>
          <div style={{ flex: 1, background: tenantSigned ? '#E8F8F0' : T.bg, border: `1px solid ${tenantSigned ? T.greenDark : T.border}33`, borderRadius: T.radiusSm, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{tenantSigned ? '✓' : '⏳'}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: tenantSigned ? T.greenDark : T.inkMuted }}>
              {tenantSigned ? 'Tenant Signed' : 'Awaiting Tenant'}
            </div>
          </div>
        </div>

        {/* Landlord signature */}
        {!landlordSigned ? (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 4 }}>Landlord Signature</div>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>I confirm this inspection report is accurate and complete.</div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Type your full name to sign</label>
              <input style={input} value={landlordSigName} onChange={e => setLandlordSigName(e.target.value)}
                placeholder="Your full name" />
            </div>

            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 12 }}>
              Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>

            {landlordSigName.trim() && (
              <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '12px 16px', marginBottom: 16, fontFamily: "'Georgia', serif", fontSize: 20, color: T.navy, fontStyle: 'italic' }}>
                {landlordSigName}
              </div>
            )}

            <button onClick={signAsLandlord} disabled={signing || !landlordSigName.trim()}
              style={{ ...btn.primary, width: '100%', padding: '14px', fontSize: 14, opacity: !landlordSigName.trim() ? 0.5 : 1 }}>
              {signing ? 'Signing...' : 'Sign as Landlord →'}
            </button>
          </div>
        ) : (
          <div style={{ background: '#E8F8F0', border: `1px solid ${T.greenDark}33`, borderRadius: T.radiusSm, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.greenDark }}>✓ Signed by {currentInspection.landlord_signature}</div>
            <div style={{ fontSize: 11, color: T.greenDark, marginTop: 2 }}>{new Date(currentInspection.landlord_signed_at!).toLocaleDateString()}</div>
          </div>
        )}

        {/* Send to tenant */}
        {landlordSigned && !tenantSigned && (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 4 }}>Tenant Signature</div>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>
              Send the inspection report to {lease.tenant_name} for review and signature.
            </div>

            {lease.email ? (
              sentToTenant ? (
                <div style={{ background: '#E8F8F0', border: `1px solid ${T.greenDark}33`, borderRadius: T.radiusSm, padding: '12px 16px', fontSize: 13, color: T.greenDark, fontWeight: 600 }}>
                  ✓ Signing link sent to {lease.email}
                </div>
              ) : (
                <button onClick={sendToTenantForSignature} disabled={sendingToTenant}
                  style={{ ...btn.primary, width: '100%', padding: '14px', fontSize: 14 }}>
                  {sendingToTenant ? 'Sending...' : `Send to ${lease.tenant_name} for Signature →`}
                </button>
              )
            ) : (
              <div style={{ background: T.amberLight, border: `1px solid ${T.amberDark}33`, borderRadius: T.radiusSm, padding: '12px 16px', fontSize: 12, color: T.amberDark }}>
                No email on file for this tenant. Add their email to send for signature.
              </div>
            )}
          </div>
        )}

        {/* Both signed */}
        {landlordSigned && tenantSigned && (
          <div style={{ background: '#E8F8F0', border: `1px solid ${T.greenDark}33`, borderRadius: T.radiusSm, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.greenDark }}>Fully Signed</div>
            <div style={{ fontSize: 13, color: T.greenDark, marginTop: 4 }}>Both parties have signed this inspection report.</div>
          </div>
        )}

        {/* Done button */}
        <button onClick={() => { setStep('list'); setInspectionId(null); setReport(''); setSentToTenant(false); setLandlordSigName(''); }}
          style={{ ...btn.ghost, width: '100%', padding: '12px', marginTop: 16 }}>
          ← Back to Inspections
        </button>
      </div>
    );
  }

  return null;
}
