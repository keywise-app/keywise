// lib/compliance/ca/ab1482-config.ts
//
// AB 1482 (Tenant Protection Act) configuration.
// Update this file annually when BLS publishes new April CPI data.
//
// Last updated: June 10, 2026
// Sources: BLS CPI-U data series (see ab1482-research-2026.md for URLs)

export const AB1482_FIXED_COMPONENT = 5.0;
export const AB1482_HARD_CAP = 10.0;
export const AB1482_MAX_INCREASES_PER_YEAR = 2;
export const AB1482_NEW_CONSTRUCTION_EXEMPTION_YEARS = 15;
export const AB1482_SUNSET_DATE = '2030-01-01'; // May have been extended to 2035 — verify

export type CpiRegionId =
  | 'los-angeles'
  | 'san-francisco'
  | 'riverside'
  | 'san-diego'
  | 'west-region';

export interface CpiRegionData {
  cpi: number | null; // null = not yet published by BLS
  label: string;
  seriesId: string;
}

export interface CpiPeriod {
  id: string;
  label: string;
  effectiveBefore?: string; // ISO date — use this period for increases before this date
  effectiveOnOrAfter?: string; // ISO date — use this period for increases on/after this date
  regions: Record<CpiRegionId, CpiRegionData>;
}

// Period 1: increases effective before Aug 1, 2026
// Uses April 2024 → April 2025 CPI change
// All values verified against BLS on June 10, 2026
const PRE_AUG_2026: CpiPeriod = {
  id: 'pre-aug-2026',
  label: 'Before August 1, 2026 (April 2025 CPI)',
  effectiveBefore: '2026-08-01',
  regions: {
    'los-angeles': { cpi: 3.0, label: 'Los Angeles-Long Beach-Anaheim', seriesId: 'CUURS49ASA0' },
    'san-francisco': { cpi: 2.5, label: 'San Francisco-Oakland-Hayward', seriesId: 'CUURS49BSA0' },
    'riverside': { cpi: 3.5, label: 'Riverside-San Bernardino-Ontario', seriesId: 'CUURS49CSA0' },
    'san-diego': { cpi: 4.0, label: 'San Diego-Carlsbad', seriesId: 'CUURS49ESA0' },
    'west-region': { cpi: 2.1, label: 'West Region (rest of CA)', seriesId: 'CUUR0400SA0' },
  },
};

// Period 2: increases effective Aug 1, 2026+
// Uses April 2025 → April 2026 CPI change
// Some regions not yet published (bimonthly BLS schedule)
const POST_AUG_2026: CpiPeriod = {
  id: 'post-aug-2026',
  label: 'August 1, 2026 and later (April 2026 CPI)',
  effectiveOnOrAfter: '2026-08-01',
  regions: {
    'los-angeles': { cpi: 3.7, label: 'Los Angeles-Long Beach-Anaheim', seriesId: 'CUURS49ASA0' },
    'san-francisco': { cpi: null, label: 'San Francisco-Oakland-Hayward (pending BLS ~July 2026)', seriesId: 'CUURS49BSA0' },
    'riverside': { cpi: null, label: 'Riverside-San Bernardino-Ontario (pending BLS)', seriesId: 'CUURS49CSA0' },
    'san-diego': { cpi: null, label: 'San Diego-Carlsbad (pending BLS)', seriesId: 'CUURS49ESA0' },
    'west-region': { cpi: 3.5, label: 'West Region (rest of CA)', seriesId: 'CUUR0400SA0' },
  },
};

export const CPI_PERIODS: CpiPeriod[] = [PRE_AUG_2026, POST_AUG_2026];

// Local rent control ordinances that may override AB 1482 (stricter = lower cap)
// These cities have their own rent stabilization; AB 1482 still applies as a ceiling
// but if the local rate is lower, the local rate controls.
export interface LocalOrdinanceConfig {
  rate: number;
  note: string;
  effectivePeriod?: string;
}

export const LOCAL_ORDINANCES: Record<string, LocalOrdinanceConfig> = {
  'Los Angeles':    { rate: 3.0, note: 'LA RSO: 3% (+ 1% if landlord pays gas/electric)', effectivePeriod: 'Jul 2025 – Jun 2026' },
  'San Francisco':  { rate: 1.4, note: '60% of SF-Oakland CPI (Oct-Oct)', effectivePeriod: 'Mar 2025 – Feb 2026' },
  'Oakland':        { rate: 0.8, note: '60% of local CPI, capped at 3%', effectivePeriod: 'Aug 2025 – Jul 2026' },
  'Berkeley':       { rate: 1.0, note: '65% of CPI (2026 AGA)', effectivePeriod: 'Jan 2026+' },
  'Santa Monica':   { rate: 2.3, note: 'Rent Control Board rate (max $60/mo)', effectivePeriod: 'Sep 2025 – Aug 2026' },
  'West Hollywood': { rate: 2.25, note: '75% of LA CPI', effectivePeriod: 'Sep 2025 – Aug 2026' },
  'Beverly Hills':  { rate: 3.9, note: 'CPI-based (through Jun 2025 — verify current)', effectivePeriod: 'Through Jun 2025' },
  'San Jose':       { rate: 2.7, note: 'CSFRA rate', effectivePeriod: 'Sep 2025+' },
  'Mountain View':  { rate: 2.7, note: 'CSFRA rate', effectivePeriod: 'Sep 2025+' },
  'Richmond':       { rate: 1.62, note: 'Rent Board AGA', effectivePeriod: '2025' },
  'Alameda':        { rate: 1.0, note: 'AGA cap', effectivePeriod: 'Sep 2025 – Aug 2026' },
  'East Palo Alto': { rate: 0, note: 'Vacancy control — contact city for current rate' },
  'Hayward':        { rate: 5.0, note: 'Up to 5% per ordinance — verify with city' },
};

// County → CPI region mapping
export const COUNTY_TO_REGION: Record<string, CpiRegionId> = {
  'Los Angeles': 'los-angeles',
  'Orange': 'los-angeles',
  'Ventura': 'los-angeles',
  'San Francisco': 'san-francisco',
  'Alameda': 'san-francisco',
  'Contra Costa': 'san-francisco',
  'Marin': 'san-francisco',
  'San Mateo': 'san-francisco',
  'Riverside': 'riverside',
  'San Bernardino': 'riverside',
  'San Diego': 'san-diego',
  // All others default to 'west-region'
};
