// lib/compliance/ca/just-cause-notice-templates.ts
//
// Notice text templates for California eviction notices.
// Templates are populated with user-provided data (ministerial function).
// The software does NOT draft custom legal language or recommend notice types.
//
// Sources: CCP 1161, CC 1946.2, SB 567

import { TENANT_RIGHTS_TEXT } from './just-cause-config';

export interface NoticeInputs {
  // Common fields
  tenantName: string;
  propertyAddress: string;
  unitNumber?: string;
  ownerName: string;
  noticeDate: string; // formatted date string

  // Pay or Quit
  rentAmount?: number;
  rentPeriod?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientHours?: string;
  paymentMethod?: string;

  // Cure or Quit
  violationDescription?: string;
  leaseClause?: string;

  // Unconditional Quit
  nuisanceDescription?: string;
  criminalActivityDescription?: string;
  sublettingDescription?: string;
  unlawfulUseDescription?: string;

  // No-fault general
  noFaultReason?: string;
  relocationAmount?: number;

  // Owner move-in
  occupantName?: string;
  occupantRelationship?: string;
  ownershipPercentage?: number;

  // Substantial remodel
  remodelDescription?: string;
  remodelTimeline?: string;

  // Government order
  orderDescription?: string;
  issuingAuthority?: string;

  // Calculated
  noticeDays?: number;
  expirationDate?: string;
}

function fullAddress(inputs: NoticeInputs): string {
  return inputs.unitNumber
    ? `${inputs.propertyAddress}, Unit ${inputs.unitNumber}`
    : inputs.propertyAddress;
}

function proofOfServiceSection(): string {
  return `

─────────────────────────────────────────────

PROOF OF SERVICE

I, the undersigned, declare under penalty of perjury under the laws of the State of California that on _____________, 20____, I served the within notice on the above-named tenant(s) by:

☐  Personal service — delivering a copy to the tenant personally.

☐  Substituted service — leaving a copy with _________________________ (name), a person of suitable age and discretion, at the tenant's ☐ residence ☐ place of business, AND mailing a copy to the tenant at the property address on _____________, 20____.

☐  Posting and mailing — affixing a copy in a conspicuous place on the property AND mailing a copy to the tenant at the property address on _____________, 20____.

Declarant: ________________________________
Signature: ________________________________
Date: ________________________________`;
}

function signatureBlock(ownerName: string): string {
  return `


________________________________
${ownerName}
Owner / Authorized Agent
Date: ________________________________`;
}

function tenantRightsBlock(): string {
  return `

─────────────────────────────────────────────
NOTICE TO TENANT (Required by California Civil Code Section 1946.2(f))
(12-point type required)

${TENANT_RIGHTS_TEXT}
─────────────────────────────────────────────`;
}

function relocationBlock(amount: number): string {
  return `

RELOCATION ASSISTANCE NOTICE

Pursuant to California Civil Code Section 1946.2(d), you are entitled to relocation assistance in the amount of $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (equal to one month's rent).

The owner elects to provide this assistance as follows (check one):

☐  Direct payment of $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} within 15 calendar days of service of this notice.

☐  Waiver of rent for the final month of the tenancy.

An owner's failure to strictly comply with this subdivision shall render this notice of termination void.`;
}

export function generateNoticeText(
  noticeType: string,
  inputs: NoticeInputs,
): string {
  switch (noticeType) {
    case 'pay_or_quit':
      return generatePayOrQuit(inputs);
    case 'cure_or_quit':
      return generateCureOrQuit(inputs);
    case 'unconditional_quit_nuisance':
      return generateUnconditionalQuitNuisance(inputs);
    case 'unconditional_quit_criminal':
      return generateUnconditionalQuitCriminal(inputs);
    case 'unconditional_quit_subletting':
      return generateUnconditionalQuitSubletting(inputs);
    case 'unconditional_quit_unlawful':
      return generateUnconditionalQuitUnlawful(inputs);
    case 'termination_30day':
      return generateTermination(inputs, 30);
    case 'termination_60day':
      return generateTermination(inputs, 60);
    case 'owner_move_in':
      return generateOwnerMoveIn(inputs);
    case 'withdrawal_from_market':
      return generateWithdrawal(inputs);
    case 'substantial_remodel':
      return generateSubstantialRemodel(inputs);
    case 'government_order':
      return generateGovernmentOrder(inputs);
    default:
      return 'Unknown notice type.';
  }
}

function generatePayOrQuit(inputs: NoticeInputs): string {
  const addr = fullAddress(inputs);
  return `THREE (3) DAY NOTICE TO PAY RENT OR QUIT
(California Code of Civil Procedure Section 1161(2))
(California Civil Code Section 1946.2(b)(1)(A))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that the rent on the above-described premises occupied by you, in the sum of $${(inputs.rentAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}, for the period of ${inputs.rentPeriod ?? '___________'}, is now due and unpaid.

YOU ARE HEREBY REQUIRED to pay the said rent in full within THREE (3) DAYS after service of this notice (excluding Saturdays, Sundays, and judicial holidays), or to quit and deliver up possession of the above-described premises to the undersigned.

Pursuant to California Civil Code Section 1946.2(b)(1)(A), default in the payment of rent constitutes just cause for termination of tenancy. Pursuant to California Code of Civil Procedure Section 1161(2), your failure to pay the rent due or to vacate the premises within the required time period may result in the filing of an unlawful detainer action against you.

PAYMENT INFORMATION (Required by CCP 1161(2)):

Rent payments shall be made to:
Name: ${inputs.recipientName ?? '___________'}
Telephone: ${inputs.recipientPhone ?? '___________'}
Address: ${inputs.recipientAddress ?? '___________'}
Available to receive payment: ${inputs.recipientHours ?? '___________'}
Payment method: ${inputs.paymentMethod ?? '___________'}

IMPORTANT: This notice demands only the rent legally due. It does not include late fees, interest, utilities, or any other charges.${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}

function generateCureOrQuit(inputs: NoticeInputs): string {
  const addr = fullAddress(inputs);
  return `THREE (3) DAY NOTICE TO PERFORM COVENANT OR QUIT
(California Code of Civil Procedure Section 1161(3))
(California Civil Code Section 1946.2(b)(1)(B))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that you are in violation of your lease/rental agreement in the following respect:

VIOLATION: ${inputs.violationDescription ?? '___________'}

LEASE CLAUSE: ${inputs.leaseClause ?? '___________'}

YOU ARE HEREBY REQUIRED to cure the above violation within THREE (3) DAYS after service of this notice (excluding Saturdays, Sundays, and judicial holidays), or to quit and deliver up possession of the above-described premises.

Pursuant to California Civil Code Section 1946.2(b)(1)(B), a breach of a material term of the lease constitutes just cause for termination of tenancy. Pursuant to California Code of Civil Procedure Section 1161(3), you have the right to cure this violation within the three-day period and thereby preserve your tenancy.${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}

function generateUnconditionalQuitNuisance(inputs: NoticeInputs): string {
  const addr = fullAddress(inputs);
  return `THREE (3) DAY NOTICE TO QUIT
(NUISANCE / WASTE — NO CURE)
(California Code of Civil Procedure Section 1161(4))
(California Civil Code Section 1946.2(b)(1)(C)/(D))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that you have committed or are maintaining a nuisance and/or committing waste on the above-described premises as follows:

${inputs.nuisanceDescription ?? '___________'}

YOU ARE HEREBY REQUIRED to quit and deliver up possession of the above-described premises within THREE (3) DAYS after service of this notice (excluding Saturdays, Sundays, and judicial holidays).

Pursuant to California Civil Code Section 1946.2(b)(1)(C) and (D), maintaining or committing a nuisance or waste constitutes just cause for termination of tenancy. Pursuant to California Code of Civil Procedure Section 1161(4), no opportunity to cure is provided for this type of violation.${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}

function generateUnconditionalQuitCriminal(inputs: NoticeInputs): string {
  const addr = fullAddress(inputs);
  return `THREE (3) DAY NOTICE TO QUIT
(CRIMINAL ACTIVITY — NO CURE)
(California Code of Civil Procedure Section 1161(4))
(California Civil Code Section 1946.2(b)(1)(F))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that you have engaged in criminal activity on the residential real property and/or criminal threats directed at the owner or agent as follows:

${inputs.criminalActivityDescription ?? '___________'}

YOU ARE HEREBY REQUIRED to quit and deliver up possession of the above-described premises within THREE (3) DAYS after service of this notice (excluding Saturdays, Sundays, and judicial holidays).

Pursuant to California Civil Code Section 1946.2(b)(1)(F), criminal activity on the property or criminal threats directed at the owner or agent constitutes just cause for termination of tenancy.${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}

function generateUnconditionalQuitSubletting(inputs: NoticeInputs): string {
  const addr = fullAddress(inputs);
  return `THREE (3) DAY NOTICE TO QUIT
(UNAUTHORIZED ASSIGNMENT/SUBLETTING — NO CURE)
(California Code of Civil Procedure Section 1161(4))
(California Civil Code Section 1946.2(b)(1)(G))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that you have assigned or sublet the above-described premises in violation of your lease/rental agreement as follows:

${inputs.sublettingDescription ?? '___________'}

YOU ARE HEREBY REQUIRED to quit and deliver up possession of the above-described premises within THREE (3) DAYS after service of this notice (excluding Saturdays, Sundays, and judicial holidays).

Pursuant to California Civil Code Section 1946.2(b)(1)(G), unauthorized assignment or subletting in violation of the lease constitutes just cause for termination of tenancy.${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}

function generateUnconditionalQuitUnlawful(inputs: NoticeInputs): string {
  const addr = fullAddress(inputs);
  return `THREE (3) DAY NOTICE TO QUIT
(UNLAWFUL USE OF PREMISES — NO CURE)
(California Code of Civil Procedure Section 1161(4))
(California Civil Code Section 1946.2(b)(1)(I))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that you have used the above-described premises for an unlawful purpose as follows:

${inputs.unlawfulUseDescription ?? '___________'}

YOU ARE HEREBY REQUIRED to quit and deliver up possession of the above-described premises within THREE (3) DAYS after service of this notice (excluding Saturdays, Sundays, and judicial holidays).

Pursuant to California Civil Code Section 1946.2(b)(1)(I), using the premises for an unlawful purpose constitutes just cause for termination of tenancy.${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}

function generateTermination(inputs: NoticeInputs, days: number): string {
  const addr = fullAddress(inputs);
  return `${days}-DAY NOTICE OF TERMINATION OF TENANCY
(No-Fault Just Cause)
(California Civil Code Section 1946.1, 1946.2(b)(2))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that your tenancy of the above-described premises is terminated effective ${days} days from the date of service of this notice.

JUST CAUSE: Pursuant to California Civil Code Section 1946.2(b)(2), the just cause for this termination is:

${inputs.noFaultReason ?? '___________'}

You are required to quit and deliver up possession of the premises on or before ${inputs.expirationDate ?? `the date that is ${days} calendar days from service of this notice`}.${inputs.relocationAmount ? relocationBlock(inputs.relocationAmount) : ''}${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}

function generateOwnerMoveIn(inputs: NoticeInputs): string {
  const addr = fullAddress(inputs);
  return `60-DAY NOTICE OF TERMINATION OF TENANCY
(Owner/Family Member Move-In)
(California Civil Code Section 1946.2(b)(2)(A))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that your tenancy of the above-described premises is terminated effective 60 days from the date of service of this notice.

JUST CAUSE: Pursuant to California Civil Code Section 1946.2(b)(2)(A), the owner or a qualifying family member intends to occupy the above-described unit as their primary residence.

INTENDED OCCUPANT: ${inputs.occupantName ?? '___________'}
RELATIONSHIP TO OWNER: ${inputs.occupantRelationship ?? '___________'}
OWNERSHIP INTEREST: ${inputs.ownershipPercentage ?? '___'}%

SB 567 REQUIREMENTS (Effective April 1, 2024):

1. The intended occupant will move into the unit within 90 days after the tenant vacates.

2. The intended occupant will occupy the unit as their primary residence for a minimum of 12 continuous months.

3. The owner holds at least 25% recorded ownership interest in the property.

4. If the intended occupant fails to occupy the unit for 12 continuous months as their primary residence, the owner must offer the unit back to the displaced tenant at the same rent that was in effect at the time of displacement and must reimburse the tenant for reasonable moving expenses.

You are required to quit and deliver up possession of the premises on or before ${inputs.expirationDate ?? 'the date that is 60 calendar days from service of this notice'}.${inputs.relocationAmount ? relocationBlock(inputs.relocationAmount) : ''}${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}

function generateWithdrawal(inputs: NoticeInputs): string {
  const addr = fullAddress(inputs);
  return `60-DAY NOTICE OF TERMINATION OF TENANCY
(Withdrawal of Residential Rental Property from the Rental Market)
(California Civil Code Section 1946.2(b)(2)(B))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that your tenancy of the above-described premises is terminated effective 60 days from the date of service of this notice.

JUST CAUSE: Pursuant to California Civil Code Section 1946.2(b)(2)(B), all rental units at the above-described property are being withdrawn from the rental market.

This withdrawal is being conducted in accordance with the Ellis Act (Government Code Section 7060 et seq.) and California Civil Code Section 1946.2(b)(2)(B).

You are required to quit and deliver up possession of the premises on or before ${inputs.expirationDate ?? 'the date that is 60 calendar days from service of this notice'}.${inputs.relocationAmount ? relocationBlock(inputs.relocationAmount) : ''}${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}

function generateSubstantialRemodel(inputs: NoticeInputs): string {
  const addr = fullAddress(inputs);
  return `60-DAY NOTICE OF TERMINATION OF TENANCY
(Substantial Remodel)
(California Civil Code Section 1946.2(b)(2)(D))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that your tenancy of the above-described premises is terminated effective 60 days from the date of service of this notice.

JUST CAUSE: Pursuant to California Civil Code Section 1946.2(b)(2)(D), the owner intends to substantially remodel the above-described unit. The remodel requires replacing or substantially modifying structural, electrical, plumbing, or mechanical systems, or abating hazardous materials, and cannot safely accommodate tenant occupancy for 30 or more consecutive days.

DESCRIPTION OF WORK:
${inputs.remodelDescription ?? '___________'}

EXPECTED TIMELINE:
${inputs.remodelTimeline ?? '___________'}

SB 567 REQUIREMENTS (Effective April 1, 2024):

1. A copy of the required permits or signed contractor agreements is available upon request.

2. RIGHT TO REOCCUPY: You have the right to request reoccupancy of the unit upon completion of the remodel at the same rent and substantially the same terms that were in effect at the time of displacement.

You are required to quit and deliver up possession of the premises on or before ${inputs.expirationDate ?? 'the date that is 60 calendar days from service of this notice'}.${inputs.relocationAmount ? relocationBlock(inputs.relocationAmount) : ''}${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}

function generateGovernmentOrder(inputs: NoticeInputs): string {
  const addr = fullAddress(inputs);
  const days = inputs.noticeDays ?? 60;
  return `${days}-DAY NOTICE OF TERMINATION OF TENANCY
(Compliance with Government or Court Order)
(California Civil Code Section 1946.2(b)(2)(C))

TO: ${inputs.tenantName}
    AND ALL OTHER TENANTS, SUBTENANTS, AND ALL OTHERS IN POSSESSION

PROPERTY: ${addr}

DATE: ${inputs.noticeDate}

PLEASE TAKE NOTICE that your tenancy of the above-described premises is terminated effective ${days} days from the date of service of this notice.

JUST CAUSE: Pursuant to California Civil Code Section 1946.2(b)(2)(C), this termination is required to comply with a government or court order relating to habitability or occupancy of the above-described premises.

ORDER DETAILS:
${inputs.orderDescription ?? '___________'}

ISSUING AUTHORITY:
${inputs.issuingAuthority ?? '___________'}

You are required to quit and deliver up possession of the premises on or before ${inputs.expirationDate ?? `the date that is ${days} calendar days from service of this notice`}.${inputs.relocationAmount ? relocationBlock(inputs.relocationAmount) : ''}${signatureBlock(inputs.ownerName)}${tenantRightsBlock()}${proofOfServiceSection()}`;
}
