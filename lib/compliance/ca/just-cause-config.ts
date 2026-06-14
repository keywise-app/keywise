// lib/compliance/ca/just-cause-config.ts
//
// Just-Cause Eviction notice type definitions for California
// Civil Code Section 1946.2 (Tenant Protection Act / AB 1482)
// as amended by SB 567 (effective April 1, 2024).
//
// This file contains factual information about notice types.
// It does NOT recommend which notice type to use — that is the user's decision.
//
// Last updated: May 2026
// Sources: CC 1946.2, CCP 1161, SB 567

export interface NoticeType {
  id: string;
  label: string;
  atFault: boolean;
  days: number;
  excludeWeekendsHolidays: boolean;
  canCure: boolean;
  cureDescription: string;
  requiresRelocation: boolean;
  statutoryBasis: string;
  justCause: string;
  description: string;
  requiredFields: string[];
}

export const NOTICE_TYPES: NoticeType[] = [
  {
    id: 'pay_or_quit',
    label: '3-Day Pay or Quit',
    atFault: true,
    days: 3,
    excludeWeekendsHolidays: true,
    canCure: true,
    cureDescription: 'Pay all rent owed',
    requiresRelocation: false,
    statutoryBasis: 'CCP 1161(2)',
    justCause: 'CC 1946.2(b)(1)(A)',
    description:
      'For unpaid rent only. The notice must state the exact amount of rent due (no late fees, utilities, or other charges). Tenant has 3 days (excluding Saturdays, Sundays, and judicial holidays) to pay or vacate.',
    requiredFields: [
      'rentAmount',
      'rentPeriod',
      'recipientName',
      'recipientPhone',
      'recipientAddress',
      'recipientHours',
      'paymentMethod',
    ],
  },
  {
    id: 'cure_or_quit',
    label: '3-Day Cure or Quit',
    atFault: true,
    days: 3,
    excludeWeekendsHolidays: true,
    canCure: true,
    cureDescription: 'Correct the lease violation',
    requiresRelocation: false,
    statutoryBasis: 'CCP 1161(3)',
    justCause: 'CC 1946.2(b)(1)(B)',
    description:
      'For material lease violations that can be corrected. The notice must describe the violation and cite the lease clause. Tenant has 3 days (excluding Saturdays, Sundays, and judicial holidays) to cure or vacate.',
    requiredFields: ['violationDescription', 'leaseClause'],
  },
  {
    id: 'unconditional_quit_nuisance',
    label: '3-Day Unconditional Quit (Nuisance/Waste)',
    atFault: true,
    days: 3,
    excludeWeekendsHolidays: true,
    canCure: false,
    cureDescription: '',
    requiresRelocation: false,
    statutoryBasis: 'CCP 1161(4)',
    justCause: 'CC 1946.2(b)(1)(C)/(D)',
    description:
      'For nuisance or waste. No opportunity to cure. Tenant must vacate within 3 days (excluding Saturdays, Sundays, and judicial holidays). The notice must describe the nuisance or waste conduct.',
    requiredFields: ['nuisanceDescription'],
  },
  {
    id: 'unconditional_quit_criminal',
    label: '3-Day Unconditional Quit (Criminal Activity)',
    atFault: true,
    days: 3,
    excludeWeekendsHolidays: true,
    canCure: false,
    cureDescription: '',
    requiresRelocation: false,
    statutoryBasis: 'CCP 1161(4)',
    justCause: 'CC 1946.2(b)(1)(F)',
    description:
      'For criminal activity on the property or criminal threats directed at the owner or agent. No opportunity to cure. Tenant must vacate within 3 days (excluding Saturdays, Sundays, and judicial holidays).',
    requiredFields: ['criminalActivityDescription'],
  },
  {
    id: 'unconditional_quit_subletting',
    label: '3-Day Unconditional Quit (Unauthorized Subletting)',
    atFault: true,
    days: 3,
    excludeWeekendsHolidays: true,
    canCure: false,
    cureDescription: '',
    requiresRelocation: false,
    statutoryBasis: 'CCP 1161(4)',
    justCause: 'CC 1946.2(b)(1)(G)',
    description:
      'For unauthorized assignment or subletting in violation of the lease. No opportunity to cure.',
    requiredFields: ['sublettingDescription'],
  },
  {
    id: 'unconditional_quit_unlawful',
    label: '3-Day Unconditional Quit (Unlawful Use)',
    atFault: true,
    days: 3,
    excludeWeekendsHolidays: true,
    canCure: false,
    cureDescription: '',
    requiresRelocation: false,
    statutoryBasis: 'CCP 1161(4)',
    justCause: 'CC 1946.2(b)(1)(I)',
    description:
      'For using the premises for an unlawful purpose. No opportunity to cure.',
    requiredFields: ['unlawfulUseDescription'],
  },
  {
    id: 'termination_30day',
    label: '30-Day Termination (No-Fault)',
    atFault: false,
    days: 30,
    excludeWeekendsHolidays: false,
    canCure: false,
    cureDescription: '',
    requiresRelocation: true,
    statutoryBasis: 'CC 1946.1(b)',
    justCause: 'CC 1946.2(b)(2)',
    description:
      'For tenancies of less than 1 year. Requires a no-fault just cause reason. Relocation assistance of one month\'s rent is required. Calendar days (weekends/holidays not excluded).',
    requiredFields: ['noFaultReason', 'relocationAmount'],
  },
  {
    id: 'termination_60day',
    label: '60-Day Termination (No-Fault)',
    atFault: false,
    days: 60,
    excludeWeekendsHolidays: false,
    canCure: false,
    cureDescription: '',
    requiresRelocation: true,
    statutoryBasis: 'CC 1946.1(c)',
    justCause: 'CC 1946.2(b)(2)',
    description:
      'For tenancies of 1 year or more. Requires a no-fault just cause reason. Relocation assistance of one month\'s rent is required. Calendar days (weekends/holidays not excluded).',
    requiredFields: ['noFaultReason', 'relocationAmount'],
  },
  {
    id: 'owner_move_in',
    label: '60-Day Owner Move-In',
    atFault: false,
    days: 60,
    excludeWeekendsHolidays: false,
    canCure: false,
    cureDescription: '',
    requiresRelocation: true,
    statutoryBasis: 'CC 1946.1(c), CC 1946.2(b)(2)(A)',
    justCause: 'CC 1946.2(b)(2)(A)',
    description:
      'Owner or qualifying family member intends to occupy as primary residence. Per SB 567: must move in within 90 days of tenant vacating, at least 25% recorded ownership interest required, must occupy for minimum 12 continuous months. Relocation assistance required.',
    requiredFields: [
      'occupantName',
      'occupantRelationship',
      'ownershipPercentage',
      'relocationAmount',
      'confirmMoveIn90Days',
      'confirm12MonthOccupancy',
    ],
  },
  {
    id: 'withdrawal_from_market',
    label: '60-Day Withdrawal from Market',
    atFault: false,
    days: 60,
    excludeWeekendsHolidays: false,
    canCure: false,
    cureDescription: '',
    requiresRelocation: true,
    statutoryBasis: 'CC 1946.1(c), CC 1946.2(b)(2)(B)',
    justCause: 'CC 1946.2(b)(2)(B)',
    description:
      'Withdrawal of all rental units at the property from the rental market (Ellis Act). Relocation assistance required. All units must be withdrawn.',
    requiredFields: ['relocationAmount', 'confirmAllUnitsWithdrawn'],
  },
  {
    id: 'substantial_remodel',
    label: '60-Day Substantial Remodel',
    atFault: false,
    days: 60,
    excludeWeekendsHolidays: false,
    canCure: false,
    cureDescription: '',
    requiresRelocation: true,
    statutoryBasis: 'CC 1946.1(c), CC 1946.2(b)(2)(D)',
    justCause: 'CC 1946.2(b)(2)(D)',
    description:
      'Substantial remodel requiring permits that cannot safely accommodate tenant occupancy for 30+ consecutive days. Per SB 567: must provide description of work, expected timeline, copy of permits or contractor agreements, and statement that tenant may request to reoccupy at same terms.',
    requiredFields: [
      'remodelDescription',
      'remodelTimeline',
      'hasPermits',
      'relocationAmount',
      'confirmReoccupancyRight',
    ],
  },
  {
    id: 'government_order',
    label: '30/60-Day Government Order',
    atFault: false,
    days: 60,
    excludeWeekendsHolidays: false,
    canCure: false,
    cureDescription: '',
    requiresRelocation: true,
    statutoryBasis: 'CC 1946.2(b)(2)(C)',
    justCause: 'CC 1946.2(b)(2)(C)',
    description:
      'Compliance with a government or court order relating to habitability or occupancy. Relocation assistance is NOT required if the condition was caused by the tenant. Notice period depends on tenancy length (30 or 60 days).',
    requiredFields: [
      'orderDescription',
      'issuingAuthority',
      'tenantCausedCondition',
    ],
  },
];

export const AT_FAULT_TYPES = NOTICE_TYPES.filter((t) => t.atFault);
export const NO_FAULT_TYPES = NOTICE_TYPES.filter((t) => !t.atFault);

/** Required text per CC 1946.2(f) — must appear in 12-point type */
export const TENANT_RIGHTS_TEXT =
  'California law limits the amount your rent can be increased. See Section 1947.12 of the Civil Code for more information. California law also provides that after all of the tenants have continuously and lawfully occupied the property for 12 months or more or at least one of the tenants has continuously and lawfully occupied the property for 24 months or more, a landlord must provide a statement of cause in any notice to terminate a tenancy. See Section 1946.2 of the Civil Code for more information.';

export const ATTORNEY_REFERRAL_URL =
  'https://www.calbar.ca.gov/Public/Need-Legal-Help/Lawyer-Referral-Service';

export const DISCLAIMER_TEXT =
  'This tool provides factual information about California eviction notice requirements. It is NOT legal advice. The use of this tool does not create an attorney-client relationship. For legal advice specific to your situation, consult a licensed California attorney.';
