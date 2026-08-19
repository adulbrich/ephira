import {
  DAYS_IN_WEEK,
  FULL_TERM_DAYS,
  CONCEPTION_TO_CURRENT_DAY_OFFSET,
} from "@/constants/Pregnancy";
import { formatAsISODate } from "@/utils/dates";
import {
  anchorFromSetupAnswer,
  gestationalAge,
  type SetupAnswer,
} from "@/utils/pregnancyDates";

const day = (iso: string) => {
  const [year, month, date] = iso.split("-").map(Number);
  return new Date(year, month - 1, date);
};

describe("gestationalAge", () => {
  it("counts the pregnancy day from the start date plus the offset", () => {
    const age = gestationalAge("2026-01-01", 14, day("2026-01-08"));

    expect(age.pregnancyDay).toBe(21);
  });

  it("never reports a negative pregnancy day", () => {
    const age = gestationalAge("2026-06-01", 0, day("2026-01-01"));

    expect(age.pregnancyDay).toBe(0);
  });

  it("puts day 0 in week 1", () => {
    const age = gestationalAge("2026-01-01", 0, day("2026-01-01"));

    expect(age.weekNumber).toBe(1);
    expect(age.dayInWeek).toBe(0);
  });

  it("rolls into the next week on the seventh day", () => {
    expect(gestationalAge("2026-01-01", 6, day("2026-01-01")).weekNumber).toBe(
      1,
    );
    expect(gestationalAge("2026-01-01", 6, day("2026-01-01")).dayInWeek).toBe(
      6,
    );
    expect(gestationalAge("2026-01-01", 7, day("2026-01-01")).weekNumber).toBe(
      2,
    );
    expect(gestationalAge("2026-01-01", 7, day("2026-01-01")).dayInWeek).toBe(
      0,
    );
  });

  it("reports weeks past 40 rather than capping", () => {
    // A pregnancy can run past its due date. Capping the week here is what
    // made the clamp in getPregnancyWeekContent unreachable.
    const age = gestationalAge(
      "2026-01-01",
      FULL_TERM_DAYS + 7,
      day("2026-01-01"),
    );

    expect(age.weekNumber).toBe(42);
  });

  it("labels trimesters using the constants accessor", () => {
    expect(
      gestationalAge("2026-01-01", 0, day("2026-01-01")).trimesterLabel,
    ).toBe("1st Trimester");
    expect(
      gestationalAge("2026-01-01", 14 * DAYS_IN_WEEK, day("2026-01-01"))
        .trimesterLabel,
    ).toBe("2nd Trimester");
    expect(
      gestationalAge("2026-01-01", 28 * DAYS_IN_WEEK, day("2026-01-01"))
        .trimesterLabel,
    ).toBe("3rd Trimester");
  });

  it("puts the due date a full term after pregnancy day zero", () => {
    const age = gestationalAge("2026-01-01", 0, day("2026-01-01"));

    expect(formatAsISODate(age.dueDate)).toBe(
      formatAsISODate(new Date(2026, 0, 1 + FULL_TERM_DAYS)),
    );
  });

  it("moves the due date earlier as the offset grows", () => {
    const withoutOffset = gestationalAge("2026-01-01", 0, day("2026-01-01"));
    const withOffset = gestationalAge("2026-01-01", 14, day("2026-01-01"));

    expect(withOffset.dueDate.getTime()).toBeLessThan(
      withoutOffset.dueDate.getTime(),
    );
  });

  it("counts down the days remaining, stopping at zero", () => {
    expect(
      gestationalAge("2026-01-01", 0, day("2026-01-01")).dueDaysRemaining,
    ).toBe(FULL_TERM_DAYS);
    expect(
      gestationalAge("2026-01-01", FULL_TERM_DAYS + 30, day("2026-01-01"))
        .dueDaysRemaining,
    ).toBe(0);
  });

  it("reports progress as a fraction, never past one", () => {
    expect(gestationalAge("2026-01-01", 0, day("2026-01-01")).progress).toBe(0);
    expect(
      gestationalAge("2026-01-01", FULL_TERM_DAYS / 2, day("2026-01-01"))
        .progress,
    ).toBeCloseTo(0.5);
    expect(
      gestationalAge("2026-01-01", FULL_TERM_DAYS + 50, day("2026-01-01"))
        .progress,
    ).toBe(1);
  });

  it("does not read the clock", () => {
    const fixed = gestationalAge("2026-01-01", 14, day("2026-03-01"));

    expect(gestationalAge("2026-01-01", 14, day("2026-03-01"))).toEqual(fixed);
  });
});

describe("anchorFromSetupAnswer", () => {
  const today = day("2026-03-01");

  const answers: [string, SetupAnswer, number][] = [
    // [name, answer, the pregnancy day the user is describing]
    [
      "a due date twelve weeks out",
      { method: "dueDate", dueDate: day("2026-05-24") },
      FULL_TERM_DAYS - 84,
    ],
    [
      "ten weeks and three days",
      { method: "weeksPregnant", weeks: 10, days: 3 },
      9 * DAYS_IN_WEEK + 3,
    ],
    ["week one, day zero", { method: "weeksPregnant", weeks: 1, days: 0 }, 0],
    [
      "a last period fifty days ago",
      { method: "lastPeriod", lastPeriod: day("2026-01-10") },
      50,
    ],
    [
      "a conception date thirty days ago",
      { method: "conceptionDate", conceptionDate: day("2026-01-30") },
      30 + CONCEPTION_TO_CURRENT_DAY_OFFSET,
    ],
  ];

  it.each(answers)(
    "round-trips %s back to the same pregnancy day",
    (_name, answer, expectedPregnancyDay) => {
      const anchor = anchorFromSetupAnswer(answer, today);

      const age = gestationalAge(
        anchor.startDateIso,
        anchor.gestationOffsetDays,
        today,
      );

      expect(age.pregnancyDay).toBe(expectedPregnancyDay);
    },
  );

  it("anchors a last-period answer on the period itself, needing no offset", () => {
    const anchor = anchorFromSetupAnswer(
      { method: "lastPeriod", lastPeriod: day("2026-01-10") },
      today,
    );

    expect(anchor.startDateIso).toBe("2026-01-10");
    expect(anchor.gestationOffsetDays).toBe(0);
  });

  it("anchors the other answers on today", () => {
    expect(
      anchorFromSetupAnswer(
        { method: "weeksPregnant", weeks: 8, days: 0 },
        today,
      ).startDateIso,
    ).toBe("2026-03-01");
  });

  it("treats week zero as day zero rather than a negative day", () => {
    const anchor = anchorFromSetupAnswer(
      { method: "weeksPregnant", weeks: 0, days: 0 },
      today,
    );

    expect(
      gestationalAge(anchor.startDateIso, anchor.gestationOffsetDays, today)
        .pregnancyDay,
    ).toBe(0);
  });

  it("clamps a due date already in the past", () => {
    const anchor = anchorFromSetupAnswer(
      { method: "dueDate", dueDate: day("2025-01-01") },
      today,
    );

    const age = gestationalAge(
      anchor.startDateIso,
      anchor.gestationOffsetDays,
      today,
    );

    expect(age.pregnancyDay).toBeLessThanOrEqual(42 * DAYS_IN_WEEK);
  });

  it("clamps a due date further out than a whole pregnancy", () => {
    const anchor = anchorFromSetupAnswer(
      { method: "dueDate", dueDate: day("2027-06-01") },
      today,
    );

    expect(
      gestationalAge(anchor.startDateIso, anchor.gestationOffsetDays, today)
        .pregnancyDay,
    ).toBe(0);
  });
});
