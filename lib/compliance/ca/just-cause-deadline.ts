// lib/compliance/ca/just-cause-deadline.ts
//
// Date calculations for California eviction notice deadlines.
// Factual calendar computations only — no legal advice.
//
// Sources: CCP 1161 (3-day count excludes weekends/judicial holidays),
//          CCP 1013(a) (+5 days for mail service within CA)

/** California judicial holidays per CCP 135 and Government Code 6700 */
export const CA_JUDICIAL_HOLIDAYS: { date: string; name: string }[] = [
  // 2026
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-01-19', name: 'Martin Luther King Jr. Day' },
  { date: '2026-02-16', name: "Presidents' Day" },
  { date: '2026-03-31', name: 'Cesar Chavez Day (observed)' },
  { date: '2026-05-25', name: 'Memorial Day' },
  { date: '2026-06-19', name: 'Juneteenth' },
  { date: '2026-07-03', name: 'Independence Day (observed)' },
  { date: '2026-09-07', name: 'Labor Day' },
  { date: '2026-10-12', name: 'Columbus Day' },
  { date: '2026-11-11', name: "Veterans Day" },
  { date: '2026-11-26', name: 'Thanksgiving Day' },
  { date: '2026-12-25', name: 'Christmas Day' },
  // 2027
  { date: '2027-01-01', name: "New Year's Day" },
  { date: '2027-01-18', name: 'Martin Luther King Jr. Day' },
  { date: '2027-02-15', name: "Presidents' Day" },
  { date: '2027-03-31', name: 'Cesar Chavez Day' },
  { date: '2027-05-31', name: 'Memorial Day' },
  { date: '2027-06-18', name: 'Juneteenth (observed)' },
  { date: '2027-07-05', name: 'Independence Day (observed)' },
  { date: '2027-09-06', name: 'Labor Day' },
  { date: '2027-10-11', name: 'Columbus Day' },
  { date: '2027-11-11', name: "Veterans Day" },
  { date: '2027-11-25', name: 'Thanksgiving Day' },
  { date: '2027-12-24', name: 'Christmas Day (observed)' },
];

const holidaySet = new Set(CA_JUDICIAL_HOLIDAYS.map((h) => h.date));

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isJudicialHoliday(date: Date): boolean {
  const iso = date.toISOString().slice(0, 10);
  return holidaySet.has(iso);
}

function isExcludedDay(date: Date): boolean {
  return isWeekend(date) || isJudicialHoliday(date);
}

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculates the expiration date of a notice.
 *
 * For 3-day notices: the count starts the day after service and excludes
 * Saturdays, Sundays, and California judicial holidays (per CCP 1161).
 *
 * For 30/60-day notices: calendar days from service date (no exclusions).
 *
 * @param servedDate - Date the notice was served (ISO string or Date)
 * @param noticeDays - Number of days in the notice period (3, 30, 60, etc.)
 * @param excludeWeekendsHolidays - Whether to exclude weekends/holidays from count
 * @returns The expiration date (last day of the notice period)
 */
export function calculateExpirationDate(
  servedDate: string | Date,
  noticeDays: number,
  excludeWeekendsHolidays: boolean,
): Date {
  const start = typeof servedDate === 'string' ? new Date(servedDate) : new Date(servedDate);

  if (excludeWeekendsHolidays) {
    // Start counting from the day after service
    let counted = 0;
    const current = new Date(start);
    while (counted < noticeDays) {
      current.setDate(current.getDate() + 1);
      if (!isExcludedDay(current)) {
        counted++;
      }
    }
    return current;
  } else {
    // Calendar days — simply add the number of days
    return addCalendarDays(start, noticeDays);
  }
}

/**
 * Returns the earliest date an unlawful detainer action can be filed
 * (the day after the notice period expires).
 */
export function calculateEarliestUDFiling(expirationDate: string | Date): Date {
  const exp =
    typeof expirationDate === 'string' ? new Date(expirationDate) : new Date(expirationDate);
  return addCalendarDays(exp, 1);
}

/**
 * Adds additional days for mail service per CCP 1013(a).
 * +5 calendar days if both mailing and address are within California.
 * +10 calendar days if either is outside California but within the US.
 * +20 calendar days if either is outside the US.
 */
export function addMailServiceDays(
  noticeDays: number,
  mailType: 'within_ca' | 'outside_ca_within_us' | 'outside_us',
): number {
  switch (mailType) {
    case 'within_ca':
      return noticeDays + 5;
    case 'outside_ca_within_us':
      return noticeDays + 10;
    case 'outside_us':
      return noticeDays + 20;
    default:
      return noticeDays;
  }
}

/**
 * Formats a date as a human-readable string for display in notices.
 */
export function formatNoticeDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
