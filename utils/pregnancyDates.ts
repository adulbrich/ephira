import {
  CONCEPTION_DAYS_AFTER_LMP,
  CONCEPTION_TO_CURRENT_DAY_OFFSET,
  DAYS_FROM_LMP_TO_DUE,
  DAYS_IN_WEEK,
  DEFAULT_DAYS_WHEN_UNCONFIGURED,
  DEFAULT_GESTATION_OFFSET_DAYS,
  DEFAULT_LMP_DAYS_AGO,
  DEFAULT_WEEKS_WHEN_UNCONFIGURED,
  FULL_TERM_DAYS,
  MAX_GESTATION_OFFSET_DAYS,
  MAX_PREGNANCY_WEEK_INPUT,
  MIN_GESTATION_OFFSET_DAYS,
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
  /** The day the pregnancy is counted from. Setup needs it; it was re-derived. */
  pregnancyDayZero: Date;
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
    pregnancyDayZero,
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

/**
 * A stored gestation offset, validated, with the default when it is not usable.
 *
 * There were three readings of this pair. Only one validated at all; the
 * pregnancy info tab did `Number(value ?? DEFAULT)`, where `??` catches a
 * missing row and nothing else, so a stored `""` read as 0 and `"abc"` as NaN
 * and both went straight into the Gestational Age. The third hardcoded 14
 * rather than naming the constant.
 *
 * An empty string is rejected here rather than read as 0, which the one
 * validating copy also let through: `Number("")` is 0, and 0 is in range.
 */
export function parseGestationOffset(
  stored: string | null | undefined,
): number {
  if (stored === null || stored === undefined || stored.trim() === "") {
    return DEFAULT_GESTATION_OFFSET_DAYS;
  }

  const offset = Number(stored);

  return Number.isFinite(offset) &&
    offset >= MIN_GESTATION_OFFSET_DAYS &&
    offset <= MAX_GESTATION_OFFSET_DAYS
    ? offset
    : DEFAULT_GESTATION_OFFSET_DAYS;
}

/** What the setup dialog opens with, given what is already stored. */
export type PregnancySetupDefaults = {
  dueDate: Date;
  lastPeriod: Date;
  conceptionDate: Date;
  weeks: number;
  days: number;
};

/**
 * The other direction: an anchor back to the answers setup asks for.
 *
 * `anchorFromSetupAnswer` turns an answer into an anchor; this turns an anchor
 * back into the dates and the week each question should open with, so both
 * directions of the mapping live in this module. The setup hook used to
 * recompute pregnancy day zero and the due date itself, by the same arithmetic
 * `gestationalAge` had already done.
 */
export function setupDefaultsFromAnchor(
  anchor: { startDateIso: string | null; gestationOffsetDays: number },
  referenceDay: Date,
): PregnancySetupDefaults {
  if (!anchor.startDateIso) {
    return {
      dueDate: addDays(referenceDay, DAYS_FROM_LMP_TO_DUE),
      lastPeriod: addDays(referenceDay, -DEFAULT_LMP_DAYS_AGO),
      conceptionDate: referenceDay,
      weeks: Number(DEFAULT_WEEKS_WHEN_UNCONFIGURED),
      days: Number(DEFAULT_DAYS_WHEN_UNCONFIGURED),
    };
  }

  const age = gestationalAge(
    anchor.startDateIso,
    anchor.gestationOffsetDays,
    referenceDay,
  );

  return {
    dueDate: age.dueDate,
    lastPeriod: age.pregnancyDayZero,
    conceptionDate: addDays(age.pregnancyDayZero, CONCEPTION_DAYS_AFTER_LMP),
    // Clamped here, so what the stepper shows is what saving accepts.
    // Hydration wrote the uncapped week, the stepper clamped it for display,
    // and saving validated the raw value: at week 43 the dialog showed 42 and
    // then refused it as outside 0-42.
    weeks: clampPregnancyValue(age.weekNumber, 0, MAX_PREGNANCY_WEEK_INPUT),
    days: age.dayInWeek,
  };
}
