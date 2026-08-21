import { cycleMarkedDates } from "@/services/cycleMarkedDates";
import type { Catalogue } from "@/db/catalogue";
import type { DayData, PredictedDate } from "@/constants/Interfaces";
import {
  CyclePredictionColor,
  FlowColors,
  SpecialtyFilterColor,
} from "@/constants/Colors";
import { anySymptomOption } from "@/constants/Symptoms";

const CATALOGUE: Catalogue = {
  symptoms: ["Cramps", "Headache"],
  moods: ["Happy", "Sad"],
  medications: ["Ibuprofen"],
  birthControl: ["Pill"],
};

const EMPTY_CATALOGUE: Catalogue = {
  symptoms: [],
  moods: [],
  medications: [],
  birthControl: [],
};

let nextId = 1;

function day(date: string, overrides: Partial<DayData> = {}): DayData {
  return {
    id: nextId++,
    date,
    flow_intensity: 0,
    is_cycle_start: false,
    is_cycle_end: false,
    intercourse: false,
    notes: "",
    moods: [],
    symptoms: [],
    medications: [],
    ...overrides,
  };
}

function build(input: {
  days?: DayData[];
  filters?: string[];
  catalogue?: Catalogue;
  predictions?: PredictedDate[];
}) {
  return cycleMarkedDates({
    days: input.days ?? [],
    filters: input.filters ?? [],
    catalogue: input.catalogue ?? EMPTY_CATALOGUE,
    predictions: input.predictions ?? [],
  });
}

beforeEach(() => {
  nextId = 1;
});

describe("confidence-scaled opacity on Prediction overlays", () => {
  // CONTEXT.md names confidence-scaled opacity as part of the definition of
  // Marked Dates. These four boundaries were unreachable by any test while the
  // thresholds sat inline in an async effect.
  const opacityFor = (confidence: number) => {
    const marked = build({
      predictions: [{ date: "2026-09-01", confidence }],
      filters: ["Cycle Prediction"],
    });
    return marked["2026-09-01"].periods[0].color;
  };

  it("draws below 50 at 0.4", () => {
    expect(opacityFor(49)).toBe("rgba(48, 80, 160, 0.4)");
  });

  it("draws 50 itself at 0.7, not 0.4", () => {
    expect(opacityFor(50)).toBe("rgba(48, 80, 160, 0.7)");
  });

  it("draws below 80 at 0.7", () => {
    expect(opacityFor(79)).toBe("rgba(48, 80, 160, 0.7)");
  });

  it("draws 80 itself at full opacity", () => {
    expect(opacityFor(80)).toBe("rgba(48, 80, 160, 1)");
  });

  it("derives the colour from CyclePredictionColor", () => {
    expect(CyclePredictionColor).toBe("#3050A0");
  });

  it("caps a run of predicted dates at both ends", () => {
    const marked = build({
      filters: ["Cycle Prediction"],
      predictions: [
        { date: "2026-09-01", confidence: 90 },
        { date: "2026-09-02", confidence: 90 },
        { date: "2026-09-03", confidence: 90 },
      ],
    });

    expect(marked["2026-09-01"].periods[0]).toMatchObject({
      startingDay: true,
      endingDay: false,
    });
    expect(marked["2026-09-02"].periods[0]).toMatchObject({
      startingDay: false,
      endingDay: false,
    });
    expect(marked["2026-09-03"].periods[0]).toMatchObject({
      startingDay: false,
      endingDay: true,
    });
  });
});

describe("flow runs", () => {
  it("caps the first and last day of a consecutive run", () => {
    const marked = build({
      filters: ["Flow"],
      days: [
        day("2026-08-01", { flow_intensity: 2 }),
        day("2026-08-02", { flow_intensity: 3 }),
        day("2026-08-03", { flow_intensity: 2 }),
      ],
    });

    expect(marked["2026-08-01"].periods[0]).toMatchObject({
      startingDay: true,
      endingDay: false,
      color: FlowColors.light,
    });
    expect(marked["2026-08-02"].periods[0]).toMatchObject({
      startingDay: false,
      endingDay: false,
      color: FlowColors.medium,
    });
    expect(marked["2026-08-03"].periods[0]).toMatchObject({
      startingDay: false,
      endingDay: true,
      color: FlowColors.light,
    });
  });

  it("splits a run at a one-day gap, capping both halves", () => {
    const marked = build({
      filters: ["Flow"],
      days: [
        day("2026-08-01", { flow_intensity: 2 }),
        day("2026-08-02", { flow_intensity: 0 }),
        day("2026-08-03", { flow_intensity: 2 }),
      ],
    });

    expect(marked["2026-08-01"].periods[0]).toMatchObject({
      startingDay: true,
      endingDay: true,
    });
    expect(marked["2026-08-03"].periods[0]).toMatchObject({
      startingDay: true,
      endingDay: true,
    });
  });

  it("draws a day with no flow as a transparent spacer", () => {
    const marked = build({
      filters: ["Flow"],
      days: [day("2026-08-02", { flow_intensity: 0 })],
    });

    expect(marked["2026-08-02"].periods).toEqual([{ color: "transparent" }]);
  });
});

describe("the transparent spacer invariant", () => {
  // Bars are drawn positionally: CustomDay maps periods by index. A filter that
  // does not match still has to occupy its slot, or every bar after it shifts.
  it("keeps the Flow bar at index 0 when a later filter does not match", () => {
    const marked = build({
      filters: ["Flow", "Notes"],
      days: [
        day("2026-08-01", { flow_intensity: 3, notes: "" }),
        day("2026-08-02", { flow_intensity: 3, notes: "cramping" }),
      ],
    });

    expect(marked["2026-08-01"].periods).toHaveLength(2);
    expect(marked["2026-08-02"].periods).toHaveLength(2);
    expect(marked["2026-08-01"].periods[0].color).toBe(FlowColors.medium);
    expect(marked["2026-08-02"].periods[0].color).toBe(FlowColors.medium);
    expect(marked["2026-08-01"].periods[1].color).toBe("transparent");
    expect(marked["2026-08-02"].periods[1].color).toBe(SpecialtyFilterColor);
  });

  it("keeps every date's period count equal under a Catalogue filter", () => {
    const marked = build({
      filters: ["Flow", "Cramps"],
      catalogue: CATALOGUE,
      days: [
        day("2026-08-01", { flow_intensity: 2, symptoms: ["Cramps"] }),
        day("2026-08-02", { flow_intensity: 2, symptoms: [] }),
      ],
    });

    expect(marked["2026-08-01"].periods).toHaveLength(2);
    expect(marked["2026-08-02"].periods).toHaveLength(2);
    expect(marked["2026-08-02"].periods[1].color).toBe("transparent");
  });
});

describe("Catalogue-driven filters", () => {
  it("matches a named Symptom only when the Catalogue holds it", () => {
    const withCatalogue = build({
      filters: ["Cramps"],
      catalogue: CATALOGUE,
      days: [day("2026-08-01", { symptoms: ["Cramps"] })],
    });
    expect(withCatalogue["2026-08-01"].periods[0].color).toBe(
      SpecialtyFilterColor,
    );

    // The same filter name, with the Symptom no longer in the Catalogue.
    const withoutCatalogue = build({
      filters: ["Cramps"],
      catalogue: EMPTY_CATALOGUE,
      days: [day("2026-08-01", { symptoms: ["Cramps"] })],
    });
    expect(withoutCatalogue["2026-08-01"].periods).toEqual([]);
  });

  it("treats the any-Symptom option as matching whatever is logged", () => {
    const marked = build({
      filters: [anySymptomOption],
      catalogue: CATALOGUE,
      days: [
        day("2026-08-01", { symptoms: ["Headache"] }),
        day("2026-08-02", { symptoms: [] }),
      ],
    });

    expect(marked["2026-08-01"].periods[0].color).toBe(SpecialtyFilterColor);
    expect(marked["2026-08-02"].periods[0].color).toBe("transparent");
  });

  it("flags birth control and intercourse rather than drawing bars", () => {
    const marked = build({
      filters: ["Any Birth Control", "Intercourse"],
      catalogue: CATALOGUE,
      days: [
        day("2026-08-01", { medications: ["Pill"], intercourse: true }),
        day("2026-08-02", {}),
      ],
    });

    expect(marked["2026-08-01"]).toMatchObject({
      hasBirthControl: true,
      hasIntercourse: true,
    });
    expect(marked["2026-08-02"]).toMatchObject({
      hasBirthControl: false,
      hasIntercourse: false,
    });
    expect(marked["2026-08-01"].periods).toEqual([]);
  });
});

describe("precedence and shape", () => {
  it("lets a logged Day overlay a Prediction on the same date", () => {
    const marked = build({
      filters: ["Flow", "Cycle Prediction"],
      days: [day("2026-09-01", { flow_intensity: 4 })],
      predictions: [{ date: "2026-09-01", confidence: 90 }],
    });

    expect(marked["2026-09-01"].periods[0].color).toBe(FlowColors.heavy);
  });

  it("keeps a Prediction on a date with no logged Day", () => {
    const marked = build({
      filters: ["Flow", "Cycle Prediction"],
      days: [day("2026-09-01", { flow_intensity: 4 })],
      predictions: [{ date: "2026-09-05", confidence: 90 }],
    });

    expect(marked["2026-09-05"].periods).toHaveLength(1);
  });

  it("returns an entry per Day with no bars when no filter is selected", () => {
    const marked = build({
      filters: [],
      days: [day("2026-08-01", { flow_intensity: 3 }), day("2026-08-02")],
    });

    expect(Object.keys(marked)).toEqual(["2026-08-01", "2026-08-02"]);
    expect(marked["2026-08-01"].periods).toEqual([]);
    expect(marked["2026-08-02"].periods).toEqual([]);
  });

  it("does not write a selected key", () => {
    // Selection is the calendar screen's to apply, at render, where the theme
    // colours it needs also live. See CONTEXT.md, Selected Date.
    const marked = build({
      filters: ["Flow"],
      days: [day("2026-08-01", { flow_intensity: 2 })],
      predictions: [{ date: "2026-09-01", confidence: 90 }],
    });

    for (const entry of Object.values(marked)) {
      expect(entry).not.toHaveProperty("selected");
    }
  });

  it("is pure: the same input twice gives the same output", () => {
    const input = {
      filters: ["Flow"],
      days: [day("2026-08-01", { flow_intensity: 2 })],
    };
    expect(build(input)).toEqual(build(input));
  });
});

describe("what counts as having notes", () => {
  // The `days.notes` column is nullable and insertDay writes `notes ?? null`,
  // so a Day logged through quickBirthControl has null here, not "". This rule
  // used to test `notes === ""` and marked every such Day.
  it.each([
    ["null", null],
    ["empty", ""],
    ["whitespace", "   "],
  ])("draws a spacer when notes are %s", (_label, notes) => {
    const marked = build({
      filters: ["Notes"],
      days: [day("2026-08-01", { notes })],
    });

    expect(marked["2026-08-01"].periods).toEqual([{ color: "transparent" }]);
  });

  it("draws a marker for real text", () => {
    const marked = build({
      filters: ["Notes"],
      days: [day("2026-08-01", { notes: "cramping" })],
    });

    expect(marked["2026-08-01"].periods[0].color).toBe(SpecialtyFilterColor);
  });

  it("agrees with the pregnancy builder on what blank means", () => {
    // Both modes have their own marking rules by ADR 0001, but "has notes" is
    // one question and they answered it two ways.
    const marked = build({
      filters: ["Notes"],
      days: [day("2026-08-01", { notes: null })],
    });

    expect(marked["2026-08-01"].periods[0].color).toBe("transparent");
  });
});
