export type LinkedRecord = { property_id?: string | null; property?: string | null; lease_id?: string | null };
export const normalizeAddress = (value?: string | null) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
// IDs are authoritative. Only exact legacy addresses are eligible; never match a building prefix to a unit.
export function belongsToUnit(record: LinkedRecord, unit: { id: string; address: string }) {
  return record.property_id ? record.property_id === unit.id : !!normalizeAddress(unit.address) && normalizeAddress(record.property) === normalizeAddress(unit.address);
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export type RentEntry = { id: string; amount?: number | string | null; received_cents?: number | string | null; type?: string | null; status?: string; due_date?: string | null; lease_id?: string | null };
const excluded = new Set(['void', 'voided', 'cancelled', 'canceled', 'refunded']);
export function rentSummary(entries: RentEntry[], today = localDate()) {
  let scheduled = 0, paid = 0, overdue = 0, upcoming = 0, processing = 0;
  for (const p of entries) {
    if (excluded.has(p.status || '') || (p.type && !['rent','Monthly Rent','monthly_rent'].includes(p.type))) continue;
    const amount = Math.round(Number(p.amount || 0) * 100);
    if (!Number.isFinite(amount) || amount < 0) continue;
    scheduled += amount;
    const confirmed = p.received_cents == null ? (p.status === 'paid' ? amount : 0) : Number(p.received_cents);
    if (!Number.isSafeInteger(confirmed) || confirmed < 0 || confirmed > amount) { scheduled -= amount; continue; }
    paid += confirmed;
    const remaining = amount - confirmed;
    if (p.status === 'processing') processing += remaining;
    else if (p.due_date && p.due_date < today) overdue += remaining;
    else upcoming += remaining;
  }
  return { scheduled: scheduled / 100, paid: paid / 100, overdue: overdue / 100, upcoming: upcoming / 100, processing: processing / 100, outstanding: (scheduled - paid) / 100 };
}

export type Tenancy = { archived?: boolean; status?: string; lifecycle_state?: string | null; lease_type?: string | null; start_date?: string | null; end_date?: string | null };
export function tenancyState(lease: Tenancy, today = localDate()) {
  if (lease.archived || lease.status === 'archived' || lease.lifecycle_state === 'archived') return 'archived';
  if (lease.lifecycle_state === 'ended' || ['ended','terminated','inactive'].includes(lease.status || '')) return 'ended';
  if (lease.start_date && lease.start_date > today) return 'future';
  if (lease.lifecycle_state === 'month_to_month' || ['month-to-month','month_to_month'].includes(lease.lease_type || '') || ['month-to-month','month_to_month'].includes(lease.status || '')) return 'month_to_month';
  if (lease.lifecycle_state === 'active_fixed') return lease.end_date && lease.end_date < today ? 'needs_review' : 'active_fixed';
  // A passed fixed-term date alone does not establish termination or continued occupancy.
  if (lease.end_date && lease.end_date < today) return 'needs_review';
  return lease.lifecycle_state === 'needs_review' ? 'needs_review' : 'active_fixed';
}
export function leaseIsReadOnly(lease: Tenancy, today = localDate()) {
  return ['archived','ended','future'].includes(tenancyState(lease,today));
}
