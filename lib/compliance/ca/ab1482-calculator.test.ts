// lib/compliance/ca/ab1482-calculator.test.ts
//
// Unit tests for AB 1482 rent cap calculator.
// Run with: npx tsx lib/compliance/ca/ab1482-calculator.test.ts
// Every expected value is manually calculated from the research document.

import { calculateAB1482, AB1482Input } from './ab1482-calculator';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
  }
}

function makeInput(overrides: Partial<AB1482Input> = {}): AB1482Input {
  return {
    zipCode: '95814', // Sacramento — West Region CPI
    yearBuilt: 2000,
    propertyType: 'multifamily',
    ownerType: 'individual',
    currentRent: 2000,
    effectiveDate: '2026-06-15', // before Aug 1 → pre-Aug CPI
    ...overrides,
  };
}

console.log('\n=== AB 1482 Calculator Tests ===\n');

// --- ELIGIBILITY / EXEMPTION TESTS ---
console.log('Exemptions:');

{
  const r = calculateAB1482(makeInput({ yearBuilt: 2015 }));
  assert(r.eligible === false, '15-year exemption: built 2015 → exempt', `eligible=${r.eligible}`);
  assert(r.exemptionReason!.includes('15-year'), '  reason mentions 15-year');
}

{
  const r = calculateAB1482(makeInput({ yearBuilt: 2010 }));
  assert(r.eligible === true, '15-year exemption: built 2010 → NOT exempt', `eligible=${r.eligible}`);
}

{
  const r = calculateAB1482(makeInput({ yearBuilt: 2011 }));
  assert(r.eligible === true, '15-year boundary: built 2011 → NOT exempt (2011 is not > 2011)', `eligible=${r.eligible}`);
}

{
  const r = calculateAB1482(makeInput({ propertyType: 'single-family', ownerType: 'individual', exemptionNoticeGiven: true }));
  assert(r.eligible === false, 'SFH individual + notice → exempt');
}

{
  const r = calculateAB1482(makeInput({ propertyType: 'single-family', ownerType: 'corporation', exemptionNoticeGiven: true }));
  assert(r.eligible === true, 'SFH corporation → NOT exempt');
}

{
  const r = calculateAB1482(makeInput({ propertyType: 'single-family', ownerType: 'individual', exemptionNoticeGiven: false }));
  assert(r.eligible === true, 'SFH individual WITHOUT notice → NOT exempt');
}

{
  const r = calculateAB1482(makeInput({ propertyType: 'duplex', ownerType: 'individual' }));
  assert(r.eligible === true, 'Non-owner-occupied duplex → NOT exempt (treated as multifamily)');
}

{
  const r = calculateAB1482(makeInput({ propertyType: 'duplex-owner-occupied', ownerType: 'individual' }));
  assert(r.eligible === false, 'Owner-occupied duplex individual → exempt');
}

{
  const r = calculateAB1482(makeInput({ propertyType: 'duplex-owner-occupied', ownerType: 'corporation' }));
  assert(r.eligible === true, 'Owner-occupied duplex corporation → NOT exempt');
}

// --- CPI + CALCULATION TESTS ---
console.log('\nCPI Calculations:');

{
  // Sacramento, pre-Aug, West Region CPI 2.1%, cap 7.1%
  // $2000 * 7.1% = $142
  const r = calculateAB1482(makeInput({ zipCode: '95814', currentRent: 2000, effectiveDate: '2026-06-15' }));
  assert(r.eligible === true, 'Sacramento pre-Aug: eligible');
  assert(r.cpiValue === 2.1, 'Sacramento pre-Aug: CPI = 2.1%', `got ${r.cpiValue}`);
  assert(r.applicableCap === 7.1, 'Sacramento pre-Aug: cap = 7.1%', `got ${r.applicableCap}`);
  assert(r.maxIncreaseDollars === 142, 'Sacramento pre-Aug: $142 increase', `got ${r.maxIncreaseDollars}`);
  assert(r.maxNewRent === 2142, 'Sacramento pre-Aug: max rent $2142', `got ${r.maxNewRent}`);
}

{
  // LA, post-Aug, LA CPI 3.7%, but LA RSO overrides at 3%
  // $3000 * 3% = $90
  const r = calculateAB1482(makeInput({ zipCode: '90001', currentRent: 3000, effectiveDate: '2026-09-01' }));
  assert(r.eligible === true, 'LA post-Aug: eligible');
  assert(r.localOverrides === true, 'LA post-Aug: RSO overrides', `localOverrides=${r.localOverrides}`);
  assert(r.applicableCap === 3.0, 'LA post-Aug: effective cap = 3.0% (RSO)', `got ${r.applicableCap}`);
  assert(r.maxIncreaseDollars === 90, 'LA post-Aug: $90 increase', `got ${r.maxIncreaseDollars}`);
  assert(r.maxNewRent === 3090, 'LA post-Aug: max rent $3090', `got ${r.maxNewRent}`);
}

{
  // LA, pre-Aug: LA CPI 3.0%, AB1482 cap = 8.0%, but RSO 3% overrides
  const r = calculateAB1482(makeInput({ zipCode: '90001', currentRent: 2000, effectiveDate: '2026-06-01' }));
  assert(r.localOverrides === true, 'LA pre-Aug: RSO overrides');
  assert(r.applicableCap === 3.0, 'LA pre-Aug: effective cap = 3.0%', `got ${r.applicableCap}`);
  assert(r.maxIncreaseDollars === 60, 'LA pre-Aug: $60 increase', `got ${r.maxIncreaseDollars}`);
  assert(r.localOrdinance?.city === 'Los Angeles', 'LA: local ordinance city', `got ${r.localOrdinance?.city}`);
}

{
  // SF, pre-Aug: SF CPI 2.5%, AB1482 cap = 7.5%, but SF RSO 1.4% overrides
  const r = calculateAB1482(makeInput({ zipCode: '94110', currentRent: 3000, effectiveDate: '2026-06-01' }));
  assert(r.localOverrides === true, 'SF: RSO overrides');
  assert(r.applicableCap === 1.4, 'SF: effective cap = 1.4%', `got ${r.applicableCap}`);
  assert(r.maxIncreaseDollars === 42, 'SF: $42 increase', `got ${r.maxIncreaseDollars}`);
}

{
  // San Diego, pre-Aug: CPI 4.0%, cap = 9.0%
  // $2500 * 9% = $225
  const r = calculateAB1482(makeInput({ zipCode: '92101', currentRent: 2500, effectiveDate: '2026-07-01' }));
  assert(r.cpiValue === 4.0, 'San Diego pre-Aug: CPI = 4.0%', `got ${r.cpiValue}`);
  assert(r.applicableCap === 9.0, 'San Diego pre-Aug: cap = 9.0%', `got ${r.applicableCap}`);
  assert(r.maxIncreaseDollars === 225, 'San Diego pre-Aug: $225 increase', `got ${r.maxIncreaseDollars}`);
  assert(r.maxNewRent === 2725, 'San Diego pre-Aug: max rent $2725', `got ${r.maxNewRent}`);
}

{
  // West Region post-Aug: CPI 3.5%, cap 8.5%
  // $2000 * 8.5% = $170
  const r = calculateAB1482(makeInput({ zipCode: '95814', currentRent: 2000, effectiveDate: '2026-09-01' }));
  assert(r.cpiValue === 3.5, 'West Region post-Aug: CPI = 3.5%', `got ${r.cpiValue}`);
  assert(r.applicableCap === 8.5, 'West Region post-Aug: cap = 8.5%', `got ${r.applicableCap}`);
  assert(r.maxIncreaseDollars === 170, 'West Region post-Aug: $170 increase', `got ${r.maxIncreaseDollars}`);
}

{
  // SF post-Aug: CPI pending, fallback to pre-Aug
  const r = calculateAB1482(makeInput({ zipCode: '94110', currentRent: 3000, effectiveDate: '2026-09-01' }));
  assert(r.cpiPending === true, 'SF post-Aug: CPI pending', `got ${r.cpiPending}`);
  assert(r.localOverrides === true, 'SF post-Aug: RSO still overrides');
  assert(r.applicableCap === 1.4, 'SF post-Aug: effective cap = 1.4% (RSO)', `got ${r.applicableCap}`);
}

// --- NOTICE REQUIREMENT ---
console.log('\nNotice Requirements:');

{
  const r = calculateAB1482(makeInput({ currentRent: 2000 }));
  assert(r.noticeRequired === 30, '30-day notice for increase ≤10%', `got ${r.noticeRequired}`);
}

// --- DOUBLE INCREASE ---
console.log('\nDouble Increase:');

{
  const r = calculateAB1482(makeInput({
    currentRent: 2000,
    effectiveDate: '2026-06-15',
    lastIncreaseDate: '2026-01-01',
    lastIncreaseAmount: 100,
  }));
  assert(r.doubleIncreaseWarning !== undefined, 'Double increase: warning present');
  assert(r.doubleIncreaseWarning!.priorAmount === 100, '  prior amount = $100');
  assert(r.doubleIncreaseWarning!.remainingDollars > 0, '  remaining > $0', `got ${r.doubleIncreaseWarning!.remainingDollars}`);
  assert(r.doubleIncreaseWarning!.remainingDollars < 142, '  remaining < full increase', `got ${r.doubleIncreaseWarning!.remainingDollars}`);
}

{
  const r = calculateAB1482(makeInput({
    currentRent: 2000,
    effectiveDate: '2026-06-15',
    lastIncreaseDate: '2025-01-01', // 17 months ago
    lastIncreaseAmount: 100,
  }));
  assert(r.doubleIncreaseWarning === undefined, 'No warning when last increase >12 months ago');
}

{
  const r = calculateAB1482(makeInput({ lastIncreaseDate: null, lastIncreaseAmount: null }));
  assert(r.doubleIncreaseWarning === undefined, 'No warning when no prior increase');
}

// --- OUTPUT QUALITY ---
console.log('\nOutput Quality:');

{
  const r = calculateAB1482(makeInput());
  assert(r.formulaBreakdown!.includes('2.1'), 'Formula includes CPI value');
  assert(r.formulaBreakdown!.includes('5'), 'Formula includes fixed component');
  assert(r.plainEnglish.length > 50, 'Plain English is substantive', `length=${r.plainEnglish.length}`);
  assert(r.earliestEffectiveDate !== undefined, 'Earliest effective date present');
}

// --- SUMMARY ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
