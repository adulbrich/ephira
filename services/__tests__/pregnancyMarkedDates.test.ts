import { buildPregnancyMarkedDates } from "@/services/pregnancyMarkedDates";
import { AppointmentColor, SpecialtyFilterColor } from "@/constants/Colors";
import type * as schema from "@/db/schema";

/**
 * The pregnancy marking rules, tested directly.
 *
 * ADR 0001 asked for the builder to be exported so the hook shell would be the
 * only database-bound part. These are the rules that became reachable: the
 * appointment dedupe, and the four point-event filters.
 *
 * Pregnancy marks are point events, not runs. Nothing here shares a rule with
 * `services/cycleMarkedDates.ts`, and the two are deliberately not merged.
 */

let nextId = 1;

function day(
  date: string,
  overrides: Partial<schema.PregnancyDay> = {},
): schema.PregnancyDay {
  return {
    id: nextId++,
    date,
    symptoms: null,
    moods: null,
    kicks: null,
    notes: null,
    ...overrides,
  } as schema.PregnancyDay;
}

function appointment(date: string): schema.PregnancyAppointment {
  return { id: nextId++, date } as schema.PregnancyAppointment;
}

beforeEach(() => {
  nextId = 1;
});

describe("appointments", () => {
  it("marks a date that has one", () => {
    const marked = buildPregnancyMarkedDates(
      ["Appointments"],
      [],
      [appointment("2026-08-10")],
    );

    expect(marked["2026-08-10"].periods).toEqual([
      { startingDay: true, endingDay: true, color: AppointmentColor },
    ]);
  });

  it("draws one marker for a date with several appointments", () => {
    // The dedupe rule. Two appointments on one day is ordinary, and without
    // this the date would draw two identical bars.
    const marked = buildPregnancyMarkedDates(
      ["Appointments"],
      [],
      [
        appointment("2026-08-10"),
        appointment("2026-08-10"),
        appointment("2026-08-10"),
      ],
    );

    expect(marked["2026-08-10"].periods).toHaveLength(1);
  });

  it("draws nothing when the filter is off", () => {
    const marked = buildPregnancyMarkedDates(
      [],
      [],
      [appointment("2026-08-10")],
    );

    expect(marked["2026-08-10"]).toBeUndefined();
  });
});

describe("the four day-level filters", () => {
  it("marks Symptoms only when some are logged", () => {
    const marked = buildPregnancyMarkedDates(
      ["Symptoms"],
      [
        day("2026-08-01", { symptoms: JSON.stringify(["Nausea"]) }),
        day("2026-08-02", { symptoms: JSON.stringify([]) }),
        day("2026-08-03"),
      ],
      [],
    );

    expect(marked["2026-08-01"].periods).toHaveLength(1);
    expect(marked["2026-08-01"].periods[0].color).toBe(SpecialtyFilterColor);
    expect(marked["2026-08-02"].periods).toEqual([]);
    expect(marked["2026-08-03"].periods).toEqual([]);
  });

  it("marks Moods only when some are logged", () => {
    const marked = buildPregnancyMarkedDates(
      ["Moods"],
      [
        day("2026-08-01", { moods: JSON.stringify(["Tired"]) }),
        day("2026-08-02", { moods: JSON.stringify([]) }),
      ],
      [],
    );

    expect(marked["2026-08-01"].periods).toHaveLength(1);
    expect(marked["2026-08-02"].periods).toEqual([]);
  });

  it("marks Kicks only for a positive count", () => {
    const marked = buildPregnancyMarkedDates(
      ["Kicks"],
      [
        day("2026-08-01", { kicks: 12 }),
        day("2026-08-02", { kicks: 0 }),
        day("2026-08-03", { kicks: null }),
      ],
      [],
    );

    expect(marked["2026-08-01"].periods).toHaveLength(1);
    expect(marked["2026-08-02"].periods).toEqual([]);
    expect(marked["2026-08-03"].periods).toEqual([]);
  });

  it("marks Notes only for non-blank text", () => {
    // Note what this treats as absent: null, empty, and whitespace alike. The
    // cycle builder tested `notes === ""` instead, which read a null column as
    // having notes.
    const marked = buildPregnancyMarkedDates(
      ["Notes"],
      [
        day("2026-08-01", { notes: "felt movement" }),
        day("2026-08-02", { notes: "" }),
        day("2026-08-03", { notes: "   " }),
        day("2026-08-04", { notes: null }),
      ],
      [],
    );

    expect(marked["2026-08-01"].periods).toHaveLength(1);
    expect(marked["2026-08-02"].periods).toEqual([]);
    expect(marked["2026-08-03"].periods).toEqual([]);
    expect(marked["2026-08-04"].periods).toEqual([]);
  });
});

describe("shape", () => {
  it("stacks a marker per active filter on one date", () => {
    const marked = buildPregnancyMarkedDates(
      ["Symptoms", "Moods", "Kicks", "Notes"],
      [
        day("2026-08-01", {
          symptoms: JSON.stringify(["Nausea"]),
          moods: JSON.stringify(["Tired"]),
          kicks: 3,
          notes: "a note",
        }),
      ],
      [],
    );

    expect(marked["2026-08-01"].periods).toHaveLength(4);
  });

  it("puts an appointment marker before the day's own markers", () => {
    const marked = buildPregnancyMarkedDates(
      ["Appointments", "Kicks"],
      [day("2026-08-10", { kicks: 5 })],
      [appointment("2026-08-10")],
    );

    expect(marked["2026-08-10"].periods.map((p) => p.color)).toEqual([
      AppointmentColor,
      SpecialtyFilterColor,
    ]);
  });

  it("draws every mark as its own start and end, never a run", () => {
    const marked = buildPregnancyMarkedDates(
      ["Kicks"],
      [day("2026-08-01", { kicks: 1 }), day("2026-08-02", { kicks: 1 })],
      [],
    );

    for (const date of ["2026-08-01", "2026-08-02"]) {
      expect(marked[date].periods[0]).toMatchObject({
        startingDay: true,
        endingDay: true,
      });
    }
  });

  it("does not write a selected key", () => {
    const marked = buildPregnancyMarkedDates(
      ["Appointments", "Kicks"],
      [day("2026-08-01", { kicks: 2 })],
      [appointment("2026-08-05")],
    );

    for (const entry of Object.values(marked)) {
      expect(entry).not.toHaveProperty("selected");
    }
  });
});
