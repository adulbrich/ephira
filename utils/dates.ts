/**
 * Calendar-day arithmetic, in local time. Belongs to neither tracking mode.
 *
 * Every function here treats a Date as a calendar day and ignores its time of
 * day. That is the property the app actually needs: days are stored as
 * "YYYY-MM-DD" strings and compared as days, never as instants.
 */
export const formatAsISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseISODate = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Whole calendar days between two local dates.
 *
 * Both dates are rebuilt through `Date.UTC` from their calendar components
 * first. Dividing raw millisecond deltas is off by one across a daylight
 * saving transition: a span of 84 calendar days that crosses spring-forward is
 * 84 days minus an hour, and flooring that gives 83. This is the same
 * treatment services/cyclePredictionLogic.ts:31 already uses.
 */
export const differenceInDays = (startDate: Date, endDate: Date): number => {
  const start = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const end = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

export const addDays = (base: Date, days: number): Date => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

export const startOfLocalDay = (date: Date = new Date()): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
