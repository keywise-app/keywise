'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { T, btn, card, input, label as labelStyle } from '../../../lib/theme';
import { getRoomsForProperty, PHOTO_GUIDANCE, type RoomConfig } from '../../../../lib/compliance/ca/ab2801-rooms';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Photo {
  id: string;
  room_name: string;
  photo_url: string;
  photo_path: string;
  caption: string;
  sort_order: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InspectionCapture({ unitId }: { unitId: string }) {
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [inspectionType, setInspectionType] = useState('move_in');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [rooms, setRooms] = useState<RoomConfig[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type') || 'move_in';
    const existingId = params.get('inspectionId');
    setInspectionType(typeParam);

    if (existingId) {
      setInspectionId(existingId);
      loadPhotos(existingId);
    }

    loadRooms();
  }, [unitId]);

  async function loadRooms() {
    // Try to fetch property bed/bath info for room list
    const { data: unit } = await supabase
      .from('units')
      .select('beds, baths')
      .eq('id', unitId)
      .single();

    setRooms(getRoomsForProperty(unit?.beds, unit?.baths));
  }

  async function loadPhotos(id: string) {
    const { data } = await supabase
      .from('inspection_photos')
      .select('id, room_name, photo_url, photo_path, caption, sort_order')
      .eq('inspection_id', id)
      .order('sort_order');

    setPhotos(data ?? []);
  }

  async function ensureInspection(): Promise<string | null> {
    if (inspectionId) return inspectionId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); return null; }

    const res = await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_id: unitId,
        ab2801_type: inspectionType,
        inspection_date: inspectionDate,
      }),
    });

    if (!res.ok) {
      setError('Failed to create inspection');
      return null;
    }

    const { inspection } = await res.json();
    setInspectionId(inspection.id);
    return inspection.id;
  }

  async function handlePhotoCapture(roomName: string, file: File) {
    setUploading(roomName);
    setError('');

    const id = await ensureInspection();
    if (!id) { setUploading(null); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('room_name', roomName);
    formData.append('caption', '');

    const res = await fetch(`/api/inspections/${id}/photos`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      setError('Failed to upload photo');
      setUploading(null);
      return;
    }

    const { photo } = await res.json();
    setPhotos((prev) => [...prev, photo]);
    setUploading(null);
  }

  async function handleDeletePhoto(photoId: string) {
    if (!inspectionId) return;
    const res = await fetch(`/api/inspections/${inspectionId}/photos?photoId=${photoId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
  }

  async function handleComplete() {
    if (!inspectionId) return;
    setCompleting(true);

    const { error: err } = await supabase
      .from('inspections')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', inspectionId);

    if (err) {
      setError('Failed to complete inspection');
      setCompleting(false);
      return;
    }

    window.location.href = '/inspections';
  }

  const roomsWithPhotos = new Set(photos.map((p) => p.room_name));
  const progress = rooms.length > 0 ? roomsWithPhotos.size : 0;

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      {/* Nav */}
      <nav
        style={{
          background: T.navyDark,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <a href="/inspections" style={{ color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          &larr; Back
        </a>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>New Inspection</span>
        <div style={{ width: 50 }} />
      </nav>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 16px 100px' }}>
        {/* Error */}
        {error && (
          <div style={{ background: T.coralLight, color: T.coral, padding: '10px 14px', borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Type & Date */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Type</label>
              <select
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
                disabled={!!inspectionId}
                style={{ ...input, opacity: inspectionId ? 0.6 : 1 }}
              >
                <option value="move_in">Move-In</option>
                <option value="move_out_pre_repair">Move-Out (Pre-Repair)</option>
                <option value="move_out_post_repair">Move-Out (Post-Repair)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                style={input}
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        <div
          style={{
            background: T.tealLight,
            border: `1px solid ${T.teal}33`,
            borderRadius: T.radiusSm,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            color: T.tealDark,
          }}
        >
          {progress} of {rooms.length} rooms have photos
        </div>

        {/* Photo guidance */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusSm,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 12,
            color: T.inkMid,
            lineHeight: 1.5,
          }}
        >
          <strong>Tip:</strong> {PHOTO_GUIDANCE.tip}
          <br />
          For each room: {PHOTO_GUIDANCE.wide} {PHOTO_GUIDANCE.closeUp}
        </div>

        {/* Room cards */}
        {rooms.map((room) => {
          const roomPhotos = photos.filter((p) => p.room_name === room.name);
          const isUploading = uploading === room.name;

          return (
            <div key={room.name} style={{ ...card, marginBottom: 12, padding: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: roomPhotos.length > 0 ? 12 : 0,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>
                    {room.name}
                  </div>
                  <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
                    {roomPhotos.length} photo{roomPhotos.length !== 1 ? 's' : ''} &middot;{' '}
                    {room.recommendedPhotos} recommended
                  </div>
                </div>

                <label
                  style={{
                    ...btn.teal,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: isUploading ? 'wait' : 'pointer',
                    opacity: isUploading ? 0.6 : 1,
                    fontSize: 12,
                    padding: '7px 14px',
                  }}
                >
                  {isUploading ? 'Uploading...' : '+ Photo'}
                  <input
                    ref={(el) => { fileRefs.current[room.name] = el; }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoCapture(room.name, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {/* Photo thumbnails */}
              {roomPhotos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                  {roomPhotos.map((photo) => (
                    <div key={photo.id} style={{ position: 'relative' }}>
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || photo.room_name}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: `1px solid ${T.border}`,
                        }}
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          border: 'none',
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}
                        title="Remove photo"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky bottom bar */}
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
          zIndex: 50,
        }}
      >
        <button
          style={{
            ...btn.primary,
            width: '100%',
            maxWidth: 400,
            justifyContent: 'center',
            padding: '12px 20px',
            fontSize: 14,
            opacity: photos.length === 0 || completing ? 0.5 : 1,
          }}
          disabled={photos.length === 0 || completing}
          onClick={handleComplete}
        >
          {completing ? 'Completing...' : `Complete Inspection (${photos.length} photos)`}
        </button>
      </div>
    </div>
  );
}
