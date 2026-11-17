export type LinkedRecord = { property_id?: string | null; property?: string | null; lease_id?: string | null };
export const normalizeAddress = (value?: string | null) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
// IDs are authoritative. Only exact legacy addresses are eligible; never match a building prefix to a unit.
export function belongsToUnit(record: LinkedRecord, unit: { id: string; address: string }) {
  return record.property_id ? record.property_id === unit.id : !!normalizeAddress(unit.address) && normalizeAddress(record.property) === normalizeAddress(unit.address);
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export type RentEntry = { id: string; amount?: number | string | null; status?: string; due_date?: string | null; lease_id?: string | null };
const excluded = new Set(['void', 'voided', 'cancelled', 'canceled', 'refunded']);
export function rentSummary(entries: RentEntry[], today = localDate()) {
  let scheduled = 0, paid = 0, overdue = 0, upcoming = 0, processing = 0;
  for (const p of entries) {
    if (excluded.has(p.status || '')) continue;
    const amount = Math.round(Number(p.amount || 0) * 100);
    if (!Number.isFinite(amount) || amount < 0) continue;
    scheduled += amount;
    if (p.status === 'paid') paid += amount;
    else if (p.status === 'processing') processing += amount;
    else if (p.due_date && p.due_date < today) overdue += amount;
    else upcoming += amount;
  }
  return { scheduled: scheduled / 100, paid: paid / 100, overdue: overdue / 100, upcoming: upcoming / 100, processing: processing / 100, outstanding: (scheduled - paid) / 100 };
}

export function leaseIsReadOnly(lease: { archived?: boolean; status?: string; end_date?: string | null }, today = localDate()) {
  return !!lease.archived || lease.status === 'archived' || (!!lease.end_date && lease.end_date < today);
}
