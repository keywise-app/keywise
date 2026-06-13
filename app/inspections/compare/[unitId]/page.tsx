'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { T, btn, card } from '../../../lib/theme';
import type { Finding, Classification } from '../../../../lib/compliance/ca/ab2801-analysis';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const classColors: Record<Classification, { bg: string; fg: string }> = {
  DAMAGE: { bg: T.coralLight, fg: T.coral },
  NORMAL_WEAR: { bg: T.greenLight, fg: T.greenDark },
  CHANGE: { bg: T.amberLight, fg: T.amberDark },
  UNCLEAR: { bg: T.bg, fg: T.inkMuted },
};

interface PhotoRow {
  room_name: string;
  photo_url: string;
  inspection_id: string;
}

interface RoomPair {
  room: string;
  moveIn: string[];
  moveOut: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ComparePage({ params }: { params: { unitId: string } }) {
  const unitId = params.unitId;
  const [roomPairs, setRoomPairs] = useState<RoomPair[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [moveInId, setMoveInId] = useState<string | null>(null);
  const [moveOutId, setMoveOutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [unitId]);

  async function loadData() {
    setLoading(true);

    // Get inspections for this unit
    const { data: inspections } = await supabase
      .from('inspections')
      .select('id, ab2801_type, type, status')
      .eq('unit_id', unitId)
      .eq('status', 'completed')
      .order('inspection_date', { ascending: true });

    if (!inspections || inspections.length === 0) {
      setLoading(false);
      return;
    }

    const moveIn = inspections.find(
      (i) => i.ab2801_type === 'move_in' || i.type === 'move_in',
    );
    const moveOut = inspections.find(
      (i) =>
        i.ab2801_type === 'move_out_pre_repair' ||
        i.ab2801_type === 'move_out_post_repair' ||
        i.type === 'move_out',
    );

    setMoveInId(moveIn?.id ?? null);
    setMoveOutId(moveOut?.id ?? null);

    if (!moveIn || !moveOut) {
      setLoading(false);
      return;
    }

    // Fetch photos for both inspections
    const { data: allPhotos } = await supabase
      .from('inspection_photos')
      .select('room_name, photo_url, inspection_id')
      .in('inspection_id', [moveIn.id, moveOut.id]);

    // Group by room
    const roomMap: Record<string, { moveIn: string[]; moveOut: string[] }> = {};
    for (const photo of allPhotos ?? []) {
      if (!roomMap[photo.room_name]) {
        roomMap[photo.room_name] = { moveIn: [], moveOut: [] };
      }
      if (photo.inspection_id === moveIn.id) {
        roomMap[photo.room_name].moveIn.push(photo.photo_url);
      } else {
        roomMap[photo.room_name].moveOut.push(photo.photo_url);
      }
    }

    setRoomPairs(
      Object.entries(roomMap).map(([room, data]) => ({
        room,
        moveIn: data.moveIn,
        moveOut: data.moveOut,
      })),
    );

    // Check for existing analysis
    const { data: existing } = await supabase
      .from('inspection_analyses')
      .select('ai_findings')
      .eq('unit_id', unitId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (existing?.ai_findings) {
      setFindings(existing.ai_findings as Finding[]);
    }

    setLoading(false);
  }

  async function runAnalysis() {
    if (!moveOutId) return;
    setAnalyzing(true);
    setAnalysisError('');

    try {
      const res = await fetch(`/api/inspections/${moveOutId}/analyze`, {
        method: 'POST',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Analysis failed');
      }

      const { findings: newFindings } = await res.json();
      setFindings(newFindings);
    } catch (err: any) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: T.inkMuted, fontSize: 14 }}>Loading comparison...</span>
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
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Photo Comparison</span>
        <div style={{ width: 50 }} />
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
        {/* Disclaimer */}
        <div
          style={{
            background: T.amberLight,
            border: `1px solid ${T.amber}44`,
            borderRadius: T.radiusSm,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 12,
            color: T.amberDark,
            lineHeight: 1.5,
          }}
        >
          <strong>Disclaimer:</strong> AI observations are suggestions only. Review each finding
          carefully. The AI does not make legal judgments about liability or deduction amounts.
        </div>

        {(!moveInId || !moveOutId) && (
          <div style={{ ...card, textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
              {!moveInId ? 'No move-in inspection found' : 'No move-out inspection found'}
            </div>
            <div style={{ fontSize: 13, color: T.inkMuted }}>
              Both a completed move-in and move-out inspection are needed for comparison.
            </div>
          </div>
        )}

        {moveInId && moveOutId && (
          <>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button
                style={{ ...btn.primary, opacity: analyzing ? 0.5 : 1 }}
                disabled={analyzing}
                onClick={runAnalysis}
              >
                {analyzing ? 'Analyzing...' : findings.length > 0 ? 'Re-Run AI Analysis' : 'Run AI Analysis'}
              </button>
              {findings.length > 0 && (
                <a
                  href={`/inspections/itemize/${unitId}`}
                  style={{ ...btn.teal, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Generate Itemization
                </a>
              )}
            </div>

            {analysisError && (
              <div style={{ background: T.coralLight, color: T.coral, padding: '10px 14px', borderRadius: T.radiusSm, fontSize: 13, marginBottom: 16 }}>
                {analysisError}
              </div>
            )}

            {/* Room-by-room comparison */}
            {roomPairs.map((rp) => {
              const roomFindings = findings.filter((f) => f.room === rp.room);

              return (
                <div key={rp.room} style={{ ...card, marginBottom: 16, padding: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.navy, margin: '0 0 12px' }}>
                    {rp.room}
                  </h3>

                  {/* Side-by-side photos */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: roomFindings.length > 0 ? 14 : 0 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase' as const, marginBottom: 4, letterSpacing: '0.3px' }}>
                        Move-In
                      </div>
                      {rp.moveIn.length > 0 ? (
                        rp.moveIn.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`${rp.room} move-in ${i + 1}`}
                            style={{ width: '100%', borderRadius: 8, border: `1px solid ${T.border}`, marginBottom: 4 }}
                          />
                        ))
                      ) : (
                        <div style={{ background: T.bg, borderRadius: 8, padding: 20, textAlign: 'center', fontSize: 12, color: T.inkMuted }}>
                          No photos
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase' as const, marginBottom: 4, letterSpacing: '0.3px' }}>
                        Move-Out
                      </div>
                      {rp.moveOut.length > 0 ? (
                        rp.moveOut.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`${rp.room} move-out ${i + 1}`}
                            style={{ width: '100%', borderRadius: 8, border: `1px solid ${T.border}`, marginBottom: 4 }}
                          />
                        ))
                      ) : (
                        <div style={{ background: T.bg, borderRadius: 8, padding: 20, textAlign: 'center', fontSize: 12, color: T.inkMuted }}>
                          No photos
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Findings */}
                  {roomFindings.map((f, idx) => {
                    const cc = classColors[f.classification];
                    return (
                      <div
                        key={idx}
                        style={{
                          background: cc.bg,
                          border: `1px solid ${cc.fg}22`,
                          borderRadius: T.radiusSm,
                          padding: '10px 12px',
                          marginBottom: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.4 }}>
                            {f.description}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          <span
                            style={{
                              background: cc.fg,
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              textTransform: 'uppercase' as const,
                            }}
                          >
                            {f.classification.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: 10, color: T.inkMuted }}>
                            Confidence: {f.confidence}/5
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
