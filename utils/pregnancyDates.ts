import {
  CONCEPTION_TO_CURRENT_DAY_OFFSET,
  DAYS_IN_WEEK,
  FULL_TERM_DAYS,
  MAX_PREGNANCY_WEEK_INPUT,
  clampPregnancyValue,
  getTrimesterLabel,
} from "@/constants/Pregnancy";

import {
  addDays,
  differenceInDays,
  formatAsISODate,
  parseISODate,
} from "@/utils/dates";

export const formatDueDate = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: "long", day: "numeric" });

/**
 * The derived view of a pregnancy. Nothing here is stored; it is all a
 * function of the stored start date, the stored offset and which day you ask
 * about. See CONTEXT.md, Gestational Age.
 */
export type GestationalAge = {
  /** Days elapsed, where the first day of the pregnancy is day 0. */
  pregnancyDay: number;
  /** One-based, and deliberately not capped at 40. */
  weekNumber: number;
  /** 0 to 6 within `weekNumber`. */
  dayInWeek: number;
  trimesterLabel: string;
  dueDate: Date;
  /** Never negative; a pregnancy past its due date reads 0. */
  dueDaysRemaining: number;
  /** 0 to 1, for progress indicators. */
  progress: number;
};

/**
 * Resolves a stored start date and offset against a reference day.
 *
 * `referenceDay` is required rather than defaulting to `new Date()`. A default
 * that reads the clock is a hidden input, and it is why this rule was retyped
 * at three screens instead of tested once.
 *
 * The week is not capped at 40. A pregnancy can run past its due date, and the
 * accessors that need a bounded week clamp for themselves.
 */
export function gestationalAge(
  startDateIso: string,
  gestationOffsetDays: number,
  referenceDay: Date,
): GestationalAge {
  const startDate = parseISODate(startDateIso);
  const pregnancyDay = Math.max(
    0,
    differenceInDays(startDate, referenceDay) + gestationOffsetDays,
  );

  const pregnancyDayZero = addDays(startDate, -gestationOffsetDays);

  return {
    pregnancyDay,
    weekNumber: Math.floor(pregnancyDay / DAYS_IN_WEEK) + 1,
    dayInWeek: pregnancyDay % DAYS_IN_WEEK,
    trimesterLabel: getTrimesterLabel(
      Math.floor(pregnancyDay / DAYS_IN_WEEK) + 1,
    ),
    dueDate: addDays(pregnancyDayZero, FULL_TERM_DAYS),
    dueDaysRemaining: Math.max(0, FULL_TERM_DAYS - pregnancyDay),
    progress: Math.min(1, Math.max(0, pregnancyDay / FULL_TERM_DAYS)),
  };
}

/** What the user told us during setup, in the terms they were asked. */
export type SetupAnswer =
  | { method: "dueDate"; dueDate: Date }
  | { method: "weeksPregnant"; weeks: number; days: number }
  | { method: "lastPeriod"; lastPeriod: Date }
  | { method: "conceptionDate"; conceptionDate: Date };

/** What gets stored: everything else is derived from these two. */
export type PregnancyAnchor = {
  startDateIso: string;
  gestationOffsetDays: number;
};

/**
 * The inverse of `gestationalAge`: turns a setup answer into the start date
 * and offset to store.
 *
 * Each branch works out which pregnancy day the user is describing, then the
 * shared tail below converts that into an offset from whichever date is being
 * anchored on. A last-period answer anchors on the period itself, so its
 * offset comes out as 0; the others anchor on today.
 */
export function anchorFromSetupAnswer(
  answer: SetupAnswer,
  today: Date,
): PregnancyAnchor {
  let anchorDate = today;
  let pregnancyDayToday: number;

  switch (answer.method) {
    case "dueDate":
      pregnancyDayToday = clampPregnancyValue(
        FULL_TERM_DAYS - differenceInDays(today, answer.dueDate),
        0,
        MAX_PREGNANCY_WEEK_INPUT * DAYS_IN_WEEK,
      );
      break;

    case "weeksPregnant":
      pregnancyDayToday =
        Math.max(0, answer.weeks - 1) * DAYS_IN_WEEK + answer.days;
      break;

    case "lastPeriod":
      anchorDate = answer.lastPeriod;
      pregnancyDayToday = Math.max(
        0,
        differenceInDays(answer.lastPeriod, today),
      );
      break;

    case "conceptionDate":
      pregnancyDayToday = Math.max(
        0,
        differenceInDays(answer.conceptionDate, today) +
          CONCEPTION_TO_CURRENT_DAY_OFFSET,
      );
      break;
  }

  const daysSinceAnchor = differenceInDays(anchorDate, today);

  return {
    startDateIso: formatAsISODate(anchorDate),
    gestationOffsetDays: pregnancyDayToday - daysSinceAnchor,
  };
}
