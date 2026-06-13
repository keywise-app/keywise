'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T, btn, card } from '../lib/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Inspection {
  id: string;
  unit_id: string;
  ab2801_type: string | null;
  type: string;
  status: string;
  inspection_date: string | null;
  completed_at: string | null;
  tenant_name: string;
  property: string;
}

interface Unit {
  id: string;
  address: string;
}

interface DepositItemization {
  id: string;
  unit_id: string;
  move_out_date: string;
  deadline_at: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusBadge(status: string) {
  const colors: Record<string, { bg: string; fg: string }> = {
    completed: { bg: T.greenLight, fg: T.greenDark },
    'in-progress': { bg: T.amberLight, fg: T.amberDark },
    draft: { bg: T.bg, fg: T.inkMuted },
  };
  const c = colors[status] ?? colors.draft;
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 6,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.3px',
      }}
    >
      {status}
    </span>
  );
}

function typeLabel(ab2801Type: string | null, type: string): string {
  if (ab2801Type === 'move_out_pre_repair') return 'Move-Out (Pre-Repair)';
  if (ab2801Type === 'move_out_post_repair') return 'Move-Out (Post-Repair)';
  if (ab2801Type === 'move_in') return 'Move-In';
  if (type === 'move_in') return 'Move-In';
  if (type === 'move_out') return 'Move-Out';
  return type;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [itemizations, setItemizations] = useState<DepositItemization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedType, setSelectedType] = useState('move_in');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [inspRes, unitRes, itemRes] = await Promise.all([
      supabase
        .from('inspections')
        .select('id, unit_id, ab2801_type, type, status, inspection_date, completed_at, tenant_name, property')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('units')
        .select('id, address')
        .eq('user_id', user.id),
      supabase
        .from('deposit_itemizations')
        .select('id, unit_id, move_out_date, deadline_at, status')
        .eq('user_id', user.id)
        .eq('status', 'draft'),
    ]);

    setInspections(inspRes.data ?? []);
    setUnits(unitRes.data ?? []);
    setItemizations(itemRes.data ?? []);
    setLoading(false);
  }

  function handleNewInspection() {
    if (!selectedUnit) return;
    window.location.href = `/inspections/${selectedUnit}/new?type=${selectedType}`;
  }

  // Group inspections by unit
  const grouped: Record<string, Inspection[]> = {};
  for (const insp of inspections) {
    const key = insp.unit_id || insp.property || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(insp);
  }

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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Keywise</span>
          </a>
          <span style={{ color: T.inkMuted, fontSize: 13 }}>/</span>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Inspections</span>
        </div>
        <a href="/" style={{ color: T.teal, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Dashboard
        </a>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.navy, margin: 0 }}>
              Inspections
            </h1>
            <p style={{ fontSize: 13, color: T.inkMuted, margin: '4px 0 0' }}>
              AB 2801 move-in & move-out documentation
            </p>
          </div>
          <button style={btn.primary} onClick={() => setShowNewModal(true)}>
            + New Inspection
          </button>
        </div>

        {/* Deadline banners */}
        {itemizations.map((item) => {
          const days = daysUntil(item.deadline_at);
          if (days > 14) return null;
          const urgent = days <= 3;
          return (
            <div
              key={item.id}
              style={{
                background: urgent ? T.coralLight : T.amberLight,
                border: `1px solid ${urgent ? T.coral : T.amber}44`,
                borderRadius: T.radiusSm,
                padding: '12px 16px',
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: urgent ? T.coral : T.amberDark }}>
                {days <= 0
                  ? `Deadline PASSED for unit deposit return`
                  : `${days} day${days === 1 ? '' : 's'} left to return deposit`}
              </span>
              <a
                href={`/inspections/itemize/${item.unit_id}`}
                style={{ fontSize: 12, fontWeight: 700, color: T.navy, textDecoration: 'none' }}
              >
                View Itemization
              </a>
            </div>
          );
        })}

        {/* New inspection modal */}
        {showNewModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
            onClick={() => setShowNewModal(false)}
          >
            <div
              style={{ ...card, maxWidth: 400, width: '90%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, color: T.navy, margin: '0 0 16px' }}>
                New Inspection
              </h2>

              <label style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>
                Unit
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                style={{
                  width: '100%',
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radiusSm,
                  padding: '9px 12px',
                  fontSize: 13,
                  marginBottom: 14,
                  color: T.ink,
                }}
              >
                <option value="">Select a unit...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.address}</option>
                ))}
              </select>

              <label style={{ fontSize: 11, color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.4px', display: 'block', marginBottom: 5 }}>
                Inspection Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  width: '100%',
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radiusSm,
                  padding: '9px 12px',
                  fontSize: 13,
                  marginBottom: 20,
                  color: T.ink,
                }}
              >
                <option value="move_in">Move-In</option>
                <option value="move_out_pre_repair">Move-Out (Pre-Repair)</option>
                <option value="move_out_post_repair">Move-Out (Post-Repair)</option>
              </select>

              <div style={{ display: 'flex', gap: 10 }}>
                <button style={btn.ghost} onClick={() => setShowNewModal(false)}>Cancel</button>
                <button
                  style={{ ...btn.primary, opacity: selectedUnit ? 1 : 0.5 }}
                  disabled={!selectedUnit}
                  onClick={handleNewInspection}
                >
                  Start Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: T.inkMuted, fontSize: 14 }}>
            Loading inspections...
          </div>
        )}

        {/* Empty state */}
        {!loading && inspections.length === 0 && (
          <div style={{ ...card, textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>&#128247;</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 6 }}>
              No inspections yet
            </div>
            <div style={{ fontSize: 13, color: T.inkMuted, marginBottom: 16 }}>
              Create a move-in inspection to establish baseline documentation per AB 2801.
            </div>
            <button style={btn.teal} onClick={() => setShowNewModal(true)}>
              + New Inspection
            </button>
          </div>
        )}

        {/* Inspection list grouped by unit */}
        {Object.entries(grouped).map(([unitKey, unitInspections]) => {
          const unitAddr = units.find((u) => u.id === unitKey)?.address ?? unitInspections[0]?.property ?? unitKey;
          const hasMoveOut = unitInspections.some(
            (i) => i.ab2801_type?.startsWith('move_out') || i.type === 'move_out',
          );

          return (
            <div key={unitKey} style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.navy, margin: 0 }}>
                  {unitAddr}
                </h3>
                {hasMoveOut && (
                  <a
                    href={`/inspections/compare/${unitKey}`}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: T.tealDark,
                      textDecoration: 'none',
                      background: T.tealLight,
                      padding: '4px 10px',
                      borderRadius: 6,
                    }}
                  >
                    Compare Photos
                  </a>
                )}
              </div>

              {unitInspections.map((insp) => (
                <div
                  key={insp.id}
                  style={{
                    ...card,
                    marginBottom: 8,
                    padding: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (insp.status !== 'completed') {
                      window.location.href = `/inspections/${insp.unit_id}/new?inspectionId=${insp.id}`;
                    }
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                      {typeLabel(insp.ab2801_type, insp.type)}
                    </div>
                    <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>
                      {insp.inspection_date
                        ? new Date(insp.inspection_date + 'T00:00:00').toLocaleDateString()
                        : insp.completed_at
                          ? new Date(insp.completed_at).toLocaleDateString()
                          : 'In progress'}
                    </div>
                  </div>
                  {statusBadge(insp.status)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
