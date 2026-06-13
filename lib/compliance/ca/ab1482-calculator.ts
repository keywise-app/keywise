// lib/compliance/ca/ab1482-calculator.ts
//
// Pure function: calculateAB1482(input) => result
// No side effects, no UI, fully unit-testable.
//
// LEGAL CALCULATOR — accuracy is the top priority.
// All CPI values sourced from BLS. See ab1482-research-2026.md.

import type { RentCapResult, DoubleIncreaseWarning } from '../types';
import {
  AB1482_FIXED_COMPONENT,
  AB1482_HARD_CAP,
  AB1482_NEW_CONSTRUCTION_EXEMPTION_YEARS,
  CPI_PERIODS,
  type CpiRegionId,
} from './ab1482-config';
import { lookupZip } from './zip-to-region';

export interface AB1482Input {
  zipCode: string;
  yearBuilt: number;
  propertyType: 'single-family' | 'duplex' | 'duplex-owner-occupied' | 'multifamily' | 'condo' | 'mobile-home';
  ownerType: 'individual' | 'llc-no-corp' | 'corporation';
  exemptionNoticeGiven?: boolean;
  currentRent: number;
  effectiveDate: string; // ISO date of proposed increase
  lastIncreaseDate?: string | null;
  lastIncreaseAmount?: number | null;
}

export function calculateAB1482(input: AB1482Input): RentCapResult {
  const {
    zipCode, yearBuilt, propertyType, ownerType, exemptionNoticeGiven,
    currentRent, effectiveDate, lastIncreaseDate, lastIncreaseAmount,
  } = input;

  const effectiveDateObj = new Date(effectiveDate);
  const effectiveYear = effectiveDateObj.getFullYear();

  // --- STEP 1: Zip lookup ---
  const zipResult = lookupZip(zipCode);

  // --- STEP 2: Exemption checks ---

  // 2a: New construction (15-year rolling)
  const exemptionCutoff = effectiveYear - AB1482_NEW_CONSTRUCTION_EXEMPTION_YEARS;
  if (yearBuilt > exemptionCutoff) {
    return {
      eligible: false,
      exemptionReason: `Your property was built in ${yearBuilt}, which is within the 15-year new construction exemption (cutoff: built after ${exemptionCutoff}). AB 1482 rent caps do not apply.`,
      localOrdinance: zipResult.localOrdinance,
      localOverrides: false,
      plainEnglish: `Properties built after ${exemptionCutoff} are exempt from AB 1482's rent cap. However, you may still be subject to local rent control if your city has its own ordinance.`,
    };
  }

  // 2b: Single-family / condo exemption
  if (
    (propertyType === 'single-family' || propertyType === 'condo') &&
    ownerType !== 'corporation' &&
    exemptionNoticeGiven === true
  ) {
    return {
      eligible: false,
      exemptionReason: `Single-family homes and condos owned by individuals (not corporations/REITs) are exempt from AB 1482 when proper written notice has been given per Civil Code 1946.2(e).`,
      localOrdinance: zipResult.localOrdinance,
      localOverrides: false,
      plainEnglish: `Your property qualifies for the single-family/condo exemption because you are not a corporation and you have provided the required exemption notice to your tenant.`,
    };
  }

  // 2c: Owner-occupied duplex
  if (propertyType === 'duplex-owner-occupied' && ownerType !== 'corporation') {
    return {
      eligible: false,
      exemptionReason: `Owner-occupied duplexes are exempt from AB 1482 when the owner is not a corporation, REIT, or LLC with a corporate member, and occupies one unit as their principal residence.`,
      localOrdinance: zipResult.localOrdinance,
      localOverrides: false,
      plainEnglish: `Your duplex is exempt because you live in one unit and are not a corporate owner.`,
    };
  }

  // 2d: SFH/condo owned by corporation — NOT exempt
  // (falls through to calculation)

  // 2e: SFH/condo individual but no exemption notice — NOT exempt
  // AB 1482 applies because the notice wasn't given

  // --- STEP 3: Determine CPI period and region ---
  const region = zipResult.region;

  // Find the applicable CPI period based on effective date
  let cpiValue: number | null = null;
  let cpiPending = false;
  let periodLabel = '';
  let regionLabel = '';

  // Check post-Aug period first (if effective date is on/after Aug 1)
  const postAugPeriod = CPI_PERIODS.find(p => p.effectiveOnOrAfter);
  const preAugPeriod = CPI_PERIODS.find(p => p.effectiveBefore);

  if (postAugPeriod?.effectiveOnOrAfter && effectiveDate >= postAugPeriod.effectiveOnOrAfter) {
    const regionData = postAugPeriod.regions[region];
    cpiValue = regionData.cpi;
    regionLabel = regionData.label;
    periodLabel = postAugPeriod.label;
    if (cpiValue === null) {
      cpiPending = true;
      // Fall back to pre-Aug values
      if (preAugPeriod) {
        const fallback = preAugPeriod.regions[region];
        cpiValue = fallback.cpi;
        periodLabel = `${preAugPeriod.label} (fallback — ${postAugPeriod.label} not yet published by BLS)`;
      }
    }
  } else if (preAugPeriod) {
    const regionData = preAugPeriod.regions[region];
    cpiValue = regionData.cpi;
    regionLabel = regionData.label;
    periodLabel = preAugPeriod.label;
  }

  // Safety: if we still don't have a CPI value, use 0 (results in 5% minimum)
  if (cpiValue === null) cpiValue = 0;

  // Floor CPI at 0 (negative CPI treated as 0 per statute)
  const effectiveCpi = Math.max(cpiValue, 0);

  // --- STEP 4: Calculate the cap ---
  const rawCap = AB1482_FIXED_COMPONENT + effectiveCpi;
  const applicableCap = Math.min(rawCap, AB1482_HARD_CAP);

  // Round to nearest 0.1% per statute
  const roundedCap = Math.round(applicableCap * 10) / 10;

  // --- STEP 5: Check local ordinance override ---
  const localOrd = zipResult.localOrdinance;
  let effectiveRate = roundedCap;
  let localOverrides = false;

  if (localOrd && localOrd.rate < roundedCap && localOrd.rate > 0) {
    effectiveRate = localOrd.rate;
    localOverrides = true;
  }

  // --- STEP 6: Calculate dollar amounts ---
  const maxIncreaseDollars = Math.round(currentRent * (effectiveRate / 100) * 100) / 100;
  const maxNewRent = Math.round((currentRent + maxIncreaseDollars) * 100) / 100;

  // --- STEP 7: Double-increase check ---
  let doubleIncreaseWarning: DoubleIncreaseWarning | undefined;

  if (lastIncreaseDate && lastIncreaseAmount && lastIncreaseAmount > 0) {
    const lastDate = new Date(lastIncreaseDate);
    const monthsSinceLast = (effectiveDateObj.getFullYear() - lastDate.getFullYear()) * 12
      + (effectiveDateObj.getMonth() - lastDate.getMonth());

    if (monthsSinceLast < 12) {
      // Prior increase was within 12 months — combined cap applies
      const priorPercent = (lastIncreaseAmount / (currentRent - lastIncreaseAmount)) * 100;
      const remainingPercent = Math.max(0, Math.round((effectiveRate - priorPercent) * 10) / 10);
      const baseBeforePrior = currentRent - lastIncreaseAmount;
      const remainingDollars = Math.max(0, Math.round(baseBeforePrior * (effectiveRate / 100) * 100) / 100 - lastIncreaseAmount);

      doubleIncreaseWarning = {
        priorAmount: lastIncreaseAmount,
        priorDate: lastIncreaseDate,
        combinedCapPercent: effectiveRate,
        remainingDollars: Math.round(remainingDollars * 100) / 100,
        remainingPercent,
      };
    }
  }

  // --- STEP 8: Notice requirement ---
  // Per Civil Code 827: 30-day for ≤10%, 90-day for >10%
  // Under AB 1482 the cap is ≤10%, so it's almost always 30 days
  // But cumulative increases could push over 10%
  const totalIncreasePercent = doubleIncreaseWarning
    ? effectiveRate // already the combined rate
    : (maxIncreaseDollars / currentRent) * 100;
  const noticeRequired: 30 | 90 = totalIncreasePercent > 10 ? 90 : 30;

  // Earliest effective date = today + notice period
  const today = new Date();
  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() + noticeRequired);
  const earliestEffectiveDate = earliest.toISOString().split('T')[0];

  // --- STEP 9: Formula breakdown ---
  const formulaParts = [];
  if (localOverrides && localOrd) {
    formulaParts.push(`Local ordinance (${localOrd.city}): ${localOrd.rate}%`);
    formulaParts.push(`AB 1482 cap would be ${roundedCap}% but ${localOrd.city} is stricter`);
  } else {
    formulaParts.push(`Regional CPI: ${effectiveCpi}%`);
    formulaParts.push(`+ Fixed component: ${AB1482_FIXED_COMPONENT}%`);
    formulaParts.push(`= ${effectiveCpi + AB1482_FIXED_COMPONENT}%`);
    if (rawCap > AB1482_HARD_CAP) {
      formulaParts.push(`Capped at ${AB1482_HARD_CAP}%`);
    }
  }
  const formulaBreakdown = formulaParts.join('\n');

  // --- STEP 10: Plain English ---
  let plainEnglish: string;
  if (localOverrides && localOrd) {
    plainEnglish = `Your property is in ${localOrd.city}, which has local rent control limiting increases to ${localOrd.rate}% (${localOrd.note}). This is stricter than AB 1482's ${roundedCap}% cap, so the local rate applies. You can raise rent by up to $${maxIncreaseDollars.toLocaleString()}/month. You must give your tenant at least ${noticeRequired} days written notice.`;
  } else {
    plainEnglish = `Based on the ${regionLabel || region} CPI of ${effectiveCpi}% (${periodLabel}), you can raise rent by up to ${roundedCap}% — that's $${maxIncreaseDollars.toLocaleString()}/month, for a new rent of $${maxNewRent.toLocaleString()}/month. You must give your tenant at least ${noticeRequired} days written notice.`;
  }

  if (doubleIncreaseWarning) {
    plainEnglish += ` Note: You increased rent by $${doubleIncreaseWarning.priorAmount} on ${doubleIncreaseWarning.priorDate}. Combined increases within 12 months cannot exceed ${effectiveRate}%. You have $${doubleIncreaseWarning.remainingDollars.toLocaleString()} remaining.`;
  }

  if (cpiPending) {
    plainEnglish += ` Note: The CPI for your region has not been published by BLS for the August 2026+ period yet. This calculation uses the pre-August rate as a conservative estimate. Check back after mid-July 2026 for the updated rate.`;
  }

  return {
    eligible: true,
    localOrdinance: localOrd,
    localOverrides,
    cpiRegion: regionLabel || region,
    cpiValue: effectiveCpi,
    cpiPending,
    applicableCap: effectiveRate,
    maxNewRent,
    maxIncreaseDollars,
    formulaBreakdown,
    noticeRequired,
    earliestEffectiveDate,
    doubleIncreaseWarning,
    plainEnglish,
  };
}
