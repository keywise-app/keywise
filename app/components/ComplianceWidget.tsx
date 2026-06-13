'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T } from '../lib/theme';

interface ComplianceUnit {
  id: string;
  address: string;
  zip_code: string;
  current_rent: number | null;
  last_rent_increase_date: string | null;
  last_rent_increase_amount: number | null;
  latest_calc?: {
    result_data: {
      eligible?: boolean;
      applicableCap?: number;
      maxIncreaseDollars?: number;
      maxNewRent?: number;
      noticeRequired?: number;
    };
    created_at: string;
  };
}

function monthsDiff(from: string, to: Date): number {
  const d = new Date(from);
  return (to.getFullYear() - d.getFullYear()) * 12 + (to.getMonth() - d.getMonth());
}

// Next CPI update is typically mid-July for the August period
function getNextCpiUpdateDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  // BLS publishes April CPI ~mid-July
  const julyRelease = new Date(year, 6, 15); // July 15
  if (now < julyRelease) {
    return julyRelease.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return new Date(year + 1, 6, 15).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

interface Props {
  isMobile?: boolean;
}

export default function ComplianceWidget({ isMobile = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [units, setUnits] = useState<ComplianceUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Fetch AB1482-subject properties
    const { data: props } = await supabase
      .from('properties')
      .select('id, address, zip_code, current_rent, last_rent_increase_date, last_rent_increase_amount')
      .eq('user_id', user.id)
      .eq('ab1482_subject', true)
      .order('address');

    if (!props || props.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch latest compliance_calculations for each property
    const propIds = props.map(p => p.id);
    const { data: calcs } = await supabase
      .from('compliance_calculations')
      .select('property_id, result_data, created_at')
      .in('property_id', propIds)
      .eq('calculator', 'ab1482')
      .order('created_at', { ascending: false });

    // Group calcs by property, take latest
    const latestByProp: Record<string, { result_data: any; created_at: string }> = {};
    if (calcs) {
      for (const c of calcs) {
        if (c.property_id && !latestByProp[c.property_id]) {
          latestByProp[c.property_id] = { result_data: c.result_data, created_at: c.created_at };
        }
      }
    }

    const enriched: ComplianceUnit[] = props.map(p => ({
      ...p,
      latest_calc: latestByProp[p.id] || undefined,
    }));

    setUnits(enriched);
    setLoading(false);
  }

  if (loading || units.length === 0) return null;

  const now = new Date();
  const canIncrease = units.filter(u => {
    if (!u.last_rent_increase_date) return true; // never increased = can increase
    return monthsDiff(u.last_rent_increase_date, now) >= 12;
  });
  const onHold = units.filter(u => {
    if (!u.last_rent_increase_date) return false;
    return monthsDiff(u.last_rent_increase_date, now) < 12;
  });

  const summaryText = `${canIncrease.length} can increase, ${onHold.length} on hold`;

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>AB 1482 Compliance</span>
          <span style={{ fontSize: 13, color: T.greenDark, fontWeight: 600 }}>{units.length} unit{units.length !== 1 ? 's' : ''}</span>
        </div>
        <span style={{ color: T.inkMuted, fontSize: 14, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px' }}>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: '12px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>{units.length}</div>
              <div style={{ fontSize: 10, color: T.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>AB 1482 Units</div>
            </div>
            <div style={{ background: T.greenLight, borderRadius: T.radiusSm, padding: '12px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.greenDark }}>{canIncrease.length}</div>
              <div style={{ fontSize: 10, color: T.greenDark, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>Can Increase</div>
            </div>
            <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: '12px 14px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.inkMid }}>{onHold.length}</div>
              <div style={{ fontSize: 10, color: T.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>On Hold (&lt;12mo)</div>
            </div>
            <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, marginTop: 4 }}>{getNextCpiUpdateDate()}</div>
              <div style={{ fontSize: 10, color: T.inkMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>Next CPI Update</div>
            </div>
          </div>

          {/* Per-unit rows */}
          {units.map(u => {
            const calc = u.latest_calc?.result_data;
            const cap = calc?.applicableCap;
            const maxInc = calc?.maxIncreaseDollars;
            const canInc = !u.last_rent_increase_date || monthsDiff(u.last_rent_increase_date, now) >= 12;
            const monthsSince = u.last_rent_increase_date ? monthsDiff(u.last_rent_increase_date, now) : null;

            return (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.address}</div>
                  <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
                    {u.last_rent_increase_date
                      ? `Last increase: ${new Date(u.last_rent_increase_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (${monthsSince}mo ago)`
                      : 'No prior increase on record'}
                    {maxInc != null && ` | Max: $${maxInc.toLocaleString()} (${cap}%)`}
                  </div>
                </div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: canInc ? T.greenLight : T.bg,
                  color: canInc ? T.greenDark : T.inkMuted,
                  whiteSpace: 'nowrap',
                  marginLeft: 12,
                }}>
                  {canInc ? 'Eligible' : `${12 - (monthsSince || 0)}mo left`}
                </div>
              </div>
            );
          })}

          {/* Link to calculator */}
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <a
              href="/tools/ca/ab1482-calculator"
              style={{ fontSize: 13, fontWeight: 600, color: T.teal, textDecoration: 'none' }}
            >
              Review all units &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
