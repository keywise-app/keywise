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

interface Props {
  isMobile?: boolean;
}

export default function ComplianceWidget({ isMobile = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [units, setUnits] = useState<ComplianceUnit[]>([]);
  const [inspectionCount, setInspectionCount] = useState(0);
  const [deadlineCount, setDeadlineCount] = useState(0);
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

    // Fetch latest compliance_calculations for each property
    if (props && props.length > 0) {
      const propIds = props.map(p => p.id);
      const { data: calcs } = await supabase
        .from('compliance_calculations')
        .select('property_id, result_data, created_at')
        .in('property_id', propIds)
        .eq('calculator', 'ab1482')
        .order('created_at', { ascending: false });

      const latestByProp: Record<string, { result_data: any; created_at: string }> = {};
      if (calcs) {
        for (const c of calcs) {
          if (c.property_id && !latestByProp[c.property_id]) {
            latestByProp[c.property_id] = { result_data: c.result_data, created_at: c.created_at };
          }
        }
      }

      setUnits(props.map(p => ({
        ...p,
        latest_calc: latestByProp[p.id] || undefined,
      })));
    }

    // Fetch pending inspections
    const { data: inspections } = await supabase
      .from('inspections')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['in_progress', 'pending']);
    setInspectionCount(inspections?.length || 0);

    // Fetch deposit itemizations near deadline
    const { data: itemizations } = await supabase
      .from('deposit_itemizations')
      .select('id, deadline_at, status')
      .eq('user_id', user.id)
      .neq('status', 'sent');
    const now = new Date();
    const nearDeadline = (itemizations || []).filter(i => {
      const deadline = new Date(i.deadline_at);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
      return daysLeft >= 0 && daysLeft <= 21;
    });
    setDeadlineCount(nearDeadline.length);

    setLoading(false);
  }

  if (loading) return null;

  const now = new Date();
  const canIncrease = units.filter(u => {
    if (!u.last_rent_increase_date) return true;
    return monthsDiff(u.last_rent_increase_date, now) >= 12;
  });
  const onHold = units.filter(u => {
    if (!u.last_rent_increase_date) return false;
    return monthsDiff(u.last_rent_increase_date, now) < 12;
  });

  const hasAnyData = units.length > 0 || inspectionCount > 0 || deadlineCount > 0;

  const linkStyle = { fontSize: 12, fontWeight: 600 as const, color: T.teal, textDecoration: 'none' as const };

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>Compliance Overview</span>
          {deadlineCount > 0 && (
            <span style={{ background: T.coralLight, color: T.coral, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
              {deadlineCount} deadline{deadlineCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span style={{ color: T.inkMuted, fontSize: 14, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px' }}>
          {!hasAnyData ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: T.inkMuted, fontSize: 13 }}>
              Add your first unit to start tracking compliance.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* AB 1482 */}
              <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.navy, marginBottom: 4 }}>✦ AB 1482 Rent Caps</div>
                    {units.length > 0 ? (
                      <div style={{ fontSize: 12, color: T.inkMid }}>
                        <span style={{ color: T.greenDark, fontWeight: 600 }}>{canIncrease.length} eligible</span>
                        {onHold.length > 0 && <span> · {onHold.length} on hold</span>}
                        {' · '}{units.length} unit{units.length !== 1 ? 's' : ''} tracked
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: T.inkMuted }}>No AB 1482 units flagged yet</div>
                    )}
                  </div>
                  <a href="/tools/ca/ab1482-calculator" style={linkStyle}>Review →</a>
                </div>
              </div>

              {/* Eviction Notices */}
              <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.navy, marginBottom: 4 }}>⚖ Eviction Notices</div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>Generate compliant CA notices</div>
                  </div>
                  <a href="/tools/ca/eviction-notice" style={linkStyle}>Create →</a>
                </div>
              </div>

              {/* Inspections */}
              <div style={{ background: T.bg, borderRadius: T.radiusSm, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.navy, marginBottom: 4 }}>📋 Move-In/Out Inspections</div>
                    <div style={{ fontSize: 12, color: T.inkMid }}>
                      {inspectionCount > 0 && <span style={{ color: T.amberDark, fontWeight: 600 }}>{inspectionCount} in progress</span>}
                      {inspectionCount > 0 && deadlineCount > 0 && ' · '}
                      {deadlineCount > 0 && <span style={{ color: T.coral, fontWeight: 600 }}>{deadlineCount} near deadline</span>}
                      {inspectionCount === 0 && deadlineCount === 0 && <span style={{ color: T.inkMuted }}>No pending inspections</span>}
                    </div>
                  </div>
                  <a href="/inspections" style={linkStyle}>Manage →</a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
