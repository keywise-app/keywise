// lib/compliance/ca/just-cause-defect-checker.ts
//
// Validates an eviction notice against known procedural defects.
// Returns factual observations — NOT legal conclusions or advice.
//
// Sources: CCP 1161, CC 1946.2, CC 1942.5, SB 567
// See just-cause-research-2026.md Section 11 for the full defect list.

export interface DefectCheckResult {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface DefectCheckInputs {
  noticeType: string;
  atFault: boolean;
  canCure: boolean;

  // Pay or Quit fields
  rentAmount?: number;
  includesNonRentCharges?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientHours?: string;
  paymentMethod?: string;

  // General fields
  justCauseStated?: boolean;
  serviceMethodSelected?: boolean;
  serviceMethod?: string;
  tenantRightsIncluded?: boolean;

  // Relocation
  requiresRelocation?: boolean;
  relocationAmount?: number;

  // Retaliation
  recentComplaintWithin180Days?: boolean | null; // null = unsure

  // Notice period
  noticeDays?: number;
  correctNoticePeriod?: boolean;

  // Owner move-in (SB 567)
  confirmMoveIn90Days?: boolean;
  confirm12MonthOccupancy?: boolean;
  ownershipPercentage?: number;

  // Substantial remodel (SB 567)
  hasPermits?: boolean;
  confirmReoccupancyRight?: boolean;
  remodelDescription?: string;
  remodelTimeline?: string;
}

/**
 * Checks a notice for common procedural defects.
 *
 * Each check returns a factual observation about whether a specific
 * statutory requirement appears to be met based on the inputs provided.
 *
 * This function does NOT provide legal advice or determine whether
 * a notice is legally valid. Consult an attorney for that determination.
 */
export function checkDefects(
  noticeType: string,
  inputs: DefectCheckInputs,
  tenancyMonths: number,
): DefectCheckResult[] {
  const results: DefectCheckResult[] = [];

  // 1. Just cause stated
  results.push({
    id: 'just_cause_stated',
    label: 'Just cause stated in notice',
    passed: inputs.justCauseStated !== false,
    detail: inputs.justCauseStated === false
      ? 'CC 1946.2(a) requires the just cause to be stated in the written notice. Per CC 1946.2(g), failure to comply renders the notice void.'
      : 'The notice includes a statement of just cause as required by CC 1946.2(a).',
  });

  // 2. Notice period correct
  results.push({
    id: 'notice_period',
    label: 'Notice period matches notice type',
    passed: inputs.correctNoticePeriod !== false,
    detail: inputs.correctNoticePeriod === false
      ? 'The notice period does not match the statutory requirement for this notice type. Filing before the notice period expires is a common defect (see CCP 1161).'
      : `The notice period of ${inputs.noticeDays ?? '—'} days is consistent with this notice type.`,
  });

  // 3. Rent amount — non-rent charges (pay_or_quit only)
  if (noticeType === 'pay_or_quit') {
    results.push({
      id: 'non_rent_charges',
      label: 'Amount includes only rent (no late fees, utilities, or other charges)',
      passed: !inputs.includesNonRentCharges,
      detail: inputs.includesNonRentCharges
        ? 'CCP 1161(2) requires the notice to state only the rent due. Including late fees, utilities, or other non-rent charges can invalidate the notice. Courts strictly construe the amount.'
        : 'The amount stated appears to include only rent charges.',
    });
  }

  // 4. Payment recipient info complete (pay_or_quit only)
  if (noticeType === 'pay_or_quit') {
    const hasRecipientInfo =
      !!inputs.recipientName &&
      !!inputs.recipientPhone &&
      !!inputs.recipientAddress &&
      !!inputs.recipientHours &&
      !!inputs.paymentMethod;
    results.push({
      id: 'payment_recipient_info',
      label: 'Payment recipient information complete',
      passed: hasRecipientInfo,
      detail: hasRecipientInfo
        ? 'CCP 1161(2) required information (name, phone, address, hours, payment method) appears complete.'
        : 'CCP 1161(2) requires: name, telephone number, and address of payment recipient; days/hours available to receive payment; and bank account or electronic payment information. Missing any element can void the notice.',
    });
  }

  // 5. Service method selected
  results.push({
    id: 'service_method',
    label: 'Service method selected',
    passed: !!inputs.serviceMethodSelected,
    detail: !inputs.serviceMethodSelected
      ? 'CCP 1162 requires proper service. Select a service method: personal, substituted (+ mail), or posting (+ mail).'
      : 'A service method has been selected. Ensure service is performed in compliance with CCP 1162.',
  });

  // 6. Relocation assistance for no-fault
  if (inputs.requiresRelocation) {
    const hasRelocation = (inputs.relocationAmount ?? 0) > 0;
    results.push({
      id: 'relocation_assistance',
      label: 'Relocation assistance provided (no-fault termination)',
      passed: hasRelocation,
      detail: hasRelocation
        ? `Relocation amount of $${inputs.relocationAmount?.toLocaleString()} specified. CC 1946.2(d) requires payment within 15 calendar days of service or waiver of the final month's rent.`
        : 'CC 1946.2(d) requires relocation assistance equal to one month\'s rent for no-fault terminations. Per CC 1946.2(d), "failure to strictly comply with this subdivision shall render the notice of termination void."',
    });
  }

  // 7. Tenant rights language
  results.push({
    id: 'tenant_rights_language',
    label: 'Tenant rights notification (CC 1946.2(f)) included',
    passed: inputs.tenantRightsIncluded !== false,
    detail: inputs.tenantRightsIncluded === false
      ? 'CC 1946.2(f) requires notification about rent cap and just-cause protections in 12-point type. Missing this language is a common defect.'
      : 'The required CC 1946.2(f) tenant rights notification language is included.',
  });

  // 8. Retaliation timing (180-day check)
  if (inputs.recentComplaintWithin180Days === true) {
    results.push({
      id: 'retaliation_flag',
      label: 'Potential retaliation concern (180-day window)',
      passed: false,
      detail:
        'CC 1942.5 creates a rebuttable presumption of retaliation if an eviction occurs within 180 days of a tenant complaint about habitability, a government inspection, or other protected activity. This is a factual observation about statutory timing — consult an attorney.',
    });
  } else if (inputs.recentComplaintWithin180Days === null) {
    results.push({
      id: 'retaliation_flag',
      label: 'Retaliation timing — uncertain',
      passed: true,
      detail:
        'If there has been a tenant complaint, government inspection, or repair request within the past 180 days, CC 1942.5 creates a rebuttable presumption of retaliation. Verify before proceeding.',
    });
  } else {
    results.push({
      id: 'retaliation_flag',
      label: 'No retaliation concern identified',
      passed: true,
      detail:
        'No tenant complaint or protected activity reported within the past 180 days.',
    });
  }

  // 9. Tenancy threshold for just-cause coverage
  if (tenancyMonths < 12) {
    results.push({
      id: 'tenancy_threshold',
      label: 'Tenancy under 12 months — just-cause coverage check',
      passed: true, // Not a defect, but informational
      detail:
        'CC 1946.2 just-cause protections generally apply after all tenants have occupied for 12+ months or at least one tenant for 24+ months. Verify whether just-cause requirements apply to this tenancy.',
    });
  }

  // 10. Owner move-in SB 567 requirements
  if (noticeType === 'owner_move_in') {
    results.push({
      id: 'sb567_move_in_90day',
      label: 'SB 567: 90-day move-in commitment',
      passed: !!inputs.confirmMoveIn90Days,
      detail: inputs.confirmMoveIn90Days
        ? 'Owner has confirmed intent to move in within 90 days of tenant vacating, as required by SB 567.'
        : 'SB 567 requires the intended occupant to move in within 90 days after the tenant vacates. Failure to do so requires offering the unit back to the tenant at the same rent.',
    });

    results.push({
      id: 'sb567_12month_occupancy',
      label: 'SB 567: 12-month occupancy commitment',
      passed: !!inputs.confirm12MonthOccupancy,
      detail: inputs.confirm12MonthOccupancy
        ? 'Owner has confirmed intent to occupy for minimum 12 continuous months as primary residence.'
        : 'SB 567 requires the intended occupant to occupy the unit for a minimum of 12 continuous months as their primary residence.',
    });

    const ownershipOk = (inputs.ownershipPercentage ?? 0) >= 25;
    results.push({
      id: 'sb567_ownership',
      label: 'SB 567: 25% minimum ownership interest',
      passed: ownershipOk,
      detail: ownershipOk
        ? `Ownership interest of ${inputs.ownershipPercentage}% meets the 25% minimum required by SB 567.`
        : 'SB 567 requires at least 25% recorded ownership interest for owner move-in evictions (with exceptions for family trusts).',
    });
  }

  // 11. Substantial remodel SB 567 requirements
  if (noticeType === 'substantial_remodel') {
    results.push({
      id: 'sb567_permits',
      label: 'SB 567: Permits or contractor agreements provided',
      passed: !!inputs.hasPermits,
      detail: inputs.hasPermits
        ? 'Permits or contractor agreements are available as required by SB 567.'
        : 'SB 567 requires providing a copy of required permits or contractor agreements for substantial remodel evictions.',
    });

    results.push({
      id: 'sb567_reoccupancy',
      label: 'SB 567: Tenant reoccupancy right statement',
      passed: !!inputs.confirmReoccupancyRight,
      detail: inputs.confirmReoccupancyRight
        ? 'Notice includes statement that tenant may request to reoccupy at the same terms after remodel completion.'
        : 'SB 567 requires a statement that the tenant may request to reoccupy at the same terms after remodel completion.',
    });

    results.push({
      id: 'sb567_remodel_details',
      label: 'SB 567: Remodel description and timeline provided',
      passed: !!inputs.remodelDescription && !!inputs.remodelTimeline,
      detail:
        inputs.remodelDescription && inputs.remodelTimeline
          ? 'Remodel description and expected timeline are provided as required by SB 567.'
          : 'SB 567 requires a description of the remodel work and expected timeline.',
    });
  }

  // 12. Wrong notice type for situation — curable vs non-curable
  if (inputs.canCure && noticeType.includes('unconditional')) {
    results.push({
      id: 'wrong_notice_type',
      label: 'Notice type vs. cure eligibility mismatch',
      passed: false,
      detail:
        'An unconditional quit notice was selected, but the violation may be curable. CCP 1161(3) requires a cure-or-quit notice for curable lease violations. Using the wrong notice type can invalidate the eviction.',
    });
  }

  // 13. Adequate documentation
  results.push({
    id: 'documentation',
    label: 'Documentation readiness',
    passed: true, // Informational — always passes
    detail:
      'Ensure you retain copies of: the signed lease, all prior notices, rent payment records, and any communications. Inadequate documentation is a common issue in unlawful detainer proceedings.',
  });

  return results;
}

/**
 * Returns whether any critical defects were found (defects that
 * indicate the notice may be procedurally invalid).
 */
export function hasCriticalDefects(results: DefectCheckResult[]): boolean {
  const criticalIds = [
    'just_cause_stated',
    'non_rent_charges',
    'payment_recipient_info',
    'relocation_assistance',
    'wrong_notice_type',
    'sb567_move_in_90day',
    'sb567_12month_occupancy',
    'sb567_ownership',
    'sb567_permits',
    'sb567_reoccupancy',
  ];
  return results.some((r) => !r.passed && criticalIds.includes(r.id));
}
