// lib/compliance/types.ts
// Shared types for rent cap calculators (CA AB 1482, future: NY, OR, WA)

export interface RentCapInput {
  zipCode: string;
  yearBuilt: number;
  propertyType: string;
  ownerType: string;
  exemptionNoticeGiven?: boolean;
  currentRent: number;
  effectiveDate: string; // ISO date
  lastIncreaseDate?: string | null;
  lastIncreaseAmount?: number | null;
}

export interface LocalOrdinance {
  city: string;
  rate: number;
  note: string;
  appliesTo?: string; // e.g. "Units built before 1979 with 2+ units"
}

export interface DoubleIncreaseWarning {
  priorAmount: number;
  priorDate: string;
  combinedCapPercent: number;
  remainingDollars: number;
  remainingPercent: number;
}

export interface RentCapResult {
  eligible: boolean;
  exemptionReason?: string;
  localOrdinance?: LocalOrdinance;
  localOverrides: boolean;

  cpiRegion?: string;
  cpiValue?: number;
  cpiPending?: boolean;
  applicableCap?: number;
  maxNewRent?: number;
  maxIncreaseDollars?: number;
  formulaBreakdown?: string;

  noticeRequired?: 30 | 90;
  earliestEffectiveDate?: string;

  doubleIncreaseWarning?: DoubleIncreaseWarning;

  plainEnglish: string;
}
