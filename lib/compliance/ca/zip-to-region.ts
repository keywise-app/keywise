// lib/compliance/ca/zip-to-region.ts
//
// Maps California zip codes to CPI regions and detects local rent control cities.
// Source: USPS zip code ranges by county + city-level overrides.

import { CpiRegionId, COUNTY_TO_REGION, LOCAL_ORDINANCES, type LocalOrdinanceConfig } from './ab1482-config';

interface ZipLookupResult {
  region: CpiRegionId;
  county: string;
  city?: string;
  localOrdinance?: LocalOrdinanceConfig & { city: string };
}

// Zip code prefix → county mapping for California
// Covers all CA zip prefixes (900xx–961xx)
// For zips that span counties, we use the primary county.
const ZIP_PREFIX_TO_COUNTY: [number, number, string][] = [
  // Los Angeles County
  [900, 908, 'Los Angeles'], [910, 918, 'Los Angeles'], [935, 935, 'Los Angeles'],
  // Beverly Hills, West Hollywood, Santa Monica are within LA County zips
  [902, 902, 'Los Angeles'], // Beverly Hills area

  // Orange County
  [926, 928, 'Orange'],

  // Ventura County
  [930, 932, 'Ventura'],

  // San Diego County
  [919, 921, 'San Diego'],

  // Riverside County
  [922, 922, 'Riverside'], [925, 925, 'Riverside'],

  // San Bernardino County
  [923, 924, 'San Bernardino'],

  // San Francisco County
  [941, 941, 'San Francisco'],

  // San Mateo County
  [940, 940, 'San Mateo'], [943, 944, 'San Mateo'],

  // Alameda County (Oakland, Berkeley, Alameda, Hayward)
  [945, 945, 'Alameda'], [946, 946, 'Alameda'], [947, 947, 'Alameda'],
  [944, 944, 'Alameda'], // some overlap

  // Contra Costa County
  [945, 945, 'Contra Costa'], // shared with Alameda — 945xx varies

  // Marin County
  [949, 949, 'Marin'],

  // Sacramento County
  [942, 942, 'Sacramento'], [956, 958, 'Sacramento'],

  // Santa Clara County (San Jose, Mountain View)
  [950, 953, 'Santa Clara'],

  // San Joaquin / Stanislaus / Fresno
  [932, 933, 'Kern'], [934, 934, 'Santa Barbara'],
  [936, 938, 'Fresno'], [939, 939, 'Monterey'],
  [948, 948, 'Solano'], [954, 955, 'Sonoma'],
  [959, 961, 'Shasta/Northern CA'],
];

// City detection by zip code — covers cities with local rent control
const ZIP_TO_CITY: Record<string, string> = {
  // Los Angeles — large range, only flag specific sub-cities
  '90210': 'Beverly Hills', '90211': 'Beverly Hills', '90212': 'Beverly Hills',
  '90069': 'West Hollywood', '90046': 'West Hollywood',
  '90401': 'Santa Monica', '90402': 'Santa Monica', '90403': 'Santa Monica',
  '90404': 'Santa Monica', '90405': 'Santa Monica',
  // Oakland
  '94601': 'Oakland', '94602': 'Oakland', '94603': 'Oakland', '94605': 'Oakland',
  '94606': 'Oakland', '94607': 'Oakland', '94608': 'Oakland', '94609': 'Oakland',
  '94610': 'Oakland', '94611': 'Oakland', '94612': 'Oakland', '94613': 'Oakland',
  '94618': 'Oakland', '94619': 'Oakland', '94621': 'Oakland',
  // Berkeley
  '94701': 'Berkeley', '94702': 'Berkeley', '94703': 'Berkeley', '94704': 'Berkeley',
  '94705': 'Berkeley', '94706': 'Berkeley', '94707': 'Berkeley', '94708': 'Berkeley',
  '94709': 'Berkeley', '94710': 'Berkeley', '94720': 'Berkeley',
  // San Francisco — all 941xx
  '94102': 'San Francisco', '94103': 'San Francisco', '94104': 'San Francisco',
  '94105': 'San Francisco', '94107': 'San Francisco', '94108': 'San Francisco',
  '94109': 'San Francisco', '94110': 'San Francisco', '94111': 'San Francisco',
  '94112': 'San Francisco', '94114': 'San Francisco', '94115': 'San Francisco',
  '94116': 'San Francisco', '94117': 'San Francisco', '94118': 'San Francisco',
  '94121': 'San Francisco', '94122': 'San Francisco', '94123': 'San Francisco',
  '94124': 'San Francisco', '94127': 'San Francisco', '94129': 'San Francisco',
  '94130': 'San Francisco', '94131': 'San Francisco', '94132': 'San Francisco',
  '94133': 'San Francisco', '94134': 'San Francisco',
  // San Jose
  '95101': 'San Jose', '95110': 'San Jose', '95111': 'San Jose', '95112': 'San Jose',
  '95113': 'San Jose', '95116': 'San Jose', '95117': 'San Jose', '95118': 'San Jose',
  '95119': 'San Jose', '95120': 'San Jose', '95121': 'San Jose', '95122': 'San Jose',
  '95123': 'San Jose', '95124': 'San Jose', '95125': 'San Jose', '95126': 'San Jose',
  '95127': 'San Jose', '95128': 'San Jose', '95129': 'San Jose', '95130': 'San Jose',
  '95131': 'San Jose', '95132': 'San Jose', '95133': 'San Jose', '95134': 'San Jose',
  '95135': 'San Jose', '95136': 'San Jose', '95138': 'San Jose', '95139': 'San Jose',
  '95140': 'San Jose', '95148': 'San Jose',
  // Mountain View
  '94040': 'Mountain View', '94041': 'Mountain View', '94043': 'Mountain View',
  // Richmond
  '94801': 'Richmond', '94803': 'Richmond', '94804': 'Richmond', '94805': 'Richmond', '94806': 'Richmond',
  // Alameda (city)
  '94501': 'Alameda', '94502': 'Alameda',
  // East Palo Alto
  '94303': 'East Palo Alto',
  // Hayward
  '94541': 'Hayward', '94542': 'Hayward', '94543': 'Hayward', '94544': 'Hayward', '94545': 'Hayward',
};

// For LA city proper — most 900xx/901xx/903xx-908xx/910xx-918xx zips are Los Angeles city
// but some are independent cities. We flag the whole range as potentially LA
// and let the user confirm via the city dropdown if needed.
const LA_CITY_ZIP_PREFIXES = [
  900, 901, 903, 904, 905, 906, 907, 908, 910, 911, 912, 913, 914, 915, 916, 917, 918,
];

function getCountyFromZip(zip: string): string {
  const prefix = parseInt(zip.substring(0, 3), 10);
  for (const [lo, hi, county] of ZIP_PREFIX_TO_COUNTY) {
    if (prefix >= lo && prefix <= hi) return county;
  }
  return 'Unknown';
}

export function lookupZip(zip: string): ZipLookupResult {
  const clean = zip.replace(/\D/g, '').substring(0, 5);
  if (clean.length !== 5 || !clean.startsWith('9')) {
    return { region: 'west-region', county: 'Unknown' };
  }

  // Check specific city first
  const city = ZIP_TO_CITY[clean];
  const county = getCountyFromZip(clean);
  const region = COUNTY_TO_REGION[county] || 'west-region';

  // Check for LA city (most LA County zips are in the city of LA)
  const prefix = parseInt(clean.substring(0, 3), 10);
  const isLACity = !city && LA_CITY_ZIP_PREFIXES.includes(prefix);
  const resolvedCity = city || (isLACity ? 'Los Angeles' : undefined);

  // Look up local ordinance
  const ordConfig = resolvedCity ? LOCAL_ORDINANCES[resolvedCity] : undefined;
  const localOrdinance = ordConfig ? { ...ordConfig, city: resolvedCity! } : undefined;

  return { region, county, city: resolvedCity, localOrdinance };
}
