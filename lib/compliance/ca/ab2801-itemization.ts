/**
 * AB 2801 Deposit Itemization Builder
 *
 * Takes AI findings and generates a draft itemized statement for the landlord
 * to review, edit, and finalize before sending to the tenant.
 */

import type { Finding } from './ab2801-analysis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LineItem {
  id: string;
  room: string;
  description: string;
  amount: number | null; // null = landlord must fill in
  note: string;
  photoIds: string[];
}

export interface Itemization {
  lineItems: LineItem[];
  totalDeducted: number;
  balanceToTenant: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Build itemization from AI findings
// ---------------------------------------------------------------------------

/**
 * Create draft line items from AI findings.
 * Only DAMAGE findings become suggested deduction line items.
 * Amounts are left null — the landlord must enter actual costs.
 */
export function buildItemization(findings: Finding[], depositAmount: number): Itemization {
  const damageFindings = findings.filter((f) => f.classification === 'DAMAGE');

  const lineItems: LineItem[] = damageFindings.map((f) => ({
    id: generateId(),
    room: f.room,
    description: f.description,
    amount: null,
    note: `AI confidence: ${f.confidence}/5`,
    photoIds: [],
  }));

  return {
    lineItems,
    totalDeducted: 0,
    balanceToTenant: depositAmount,
  };
}

// ---------------------------------------------------------------------------
// Recalculate totals
// ---------------------------------------------------------------------------

/**
 * Recalculate totalDeducted and balanceToTenant from the current line items.
 * Line items with null amounts are treated as $0.
 */
export function calculateTotals(
  lineItems: LineItem[],
  depositAmount: number,
): { totalDeducted: number; balanceToTenant: number } {
  const totalDeducted = lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const balanceToTenant = Math.max(0, depositAmount - totalDeducted);
  return { totalDeducted, balanceToTenant };
}

// ---------------------------------------------------------------------------
// 21-day deadline helper
// ---------------------------------------------------------------------------

/**
 * Calculate the 21-day deadline from move-out date.
 * Per Civil Code 1950.5, landlord must return deposit or provide
 * itemized statement within 21 calendar days after tenant vacates.
 */
export function getDeadline(moveOutDate: string): Date {
  const d = new Date(moveOutDate + 'T00:00:00');
  d.setDate(d.getDate() + 21);
  return d;
}

/**
 * Days remaining until the 21-day deadline.
 * Returns negative if deadline has passed.
 */
export function daysUntilDeadline(moveOutDate: string): number {
  const deadline = getDeadline(moveOutDate);
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
