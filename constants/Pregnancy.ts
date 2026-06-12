import { BABY_SIZE_BY_WEEK } from "@/data/pregnancyBabySizes";

export const PREGNANCY_WEEKS = 40;
export const DAYS_IN_WEEK = 7;
export const FULL_TERM_DAYS = PREGNANCY_WEEKS * DAYS_IN_WEEK;

export const MAX_GESTATION_OFFSET_DAYS = 280;
export const MIN_GESTATION_OFFSET_DAYS = -280;
export const MAX_PREGNANCY_WEEK_INPUT = 42;
export const MAX_DAY_IN_WEEK_INPUT = 6;

export const DEFAULT_GESTATION_OFFSET_DAYS = 14;
export const DEFAULT_WEEKS_WHEN_UNCONFIGURED = "2";
export const DEFAULT_DAYS_WHEN_UNCONFIGURED = "0";

/** Typical days from LMP to estimated due date when inferring defaults. */
export const DAYS_FROM_LMP_TO_DUE = 266;
export const DEFAULT_LMP_DAYS_AGO = 14;
export const CONCEPTION_DAYS_AFTER_LMP = 14;
export const POSITIVE_TEST_DAYS_AFTER_LMP = 28;
export const CONCEPTION_TO_CURRENT_DAY_OFFSET = 14;
export const DUE_DATE_MAX_EXTRA_DAYS = 21;

export const TRIMESTER_WEEK_ENDS = {
  first: 13,
  second: 27,
} as const;

export function getTrimesterLabel(weekNumber: number): string {
  if (weekNumber <= TRIMESTER_WEEK_ENDS.first) return "1st Trimester";
  if (weekNumber <= TRIMESTER_WEEK_ENDS.second) return "2nd Trimester";
  return "3rd Trimester";
}

export function getBabySizeForWeek(weekNumber: number): string {
  const index = Math.max(
    0,
    Math.min(BABY_SIZE_BY_WEEK.length - 1, weekNumber - 1),
  );
  return BABY_SIZE_BY_WEEK[index];
}

export function clampPregnancyValue(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, value));
}
