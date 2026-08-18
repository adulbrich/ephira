/**
 * The one definition of a Cycle.
 *
 * Before this, three modules answered "how many cycles have I logged?"
 * differently: the tested grouping here, a private copy in useCyclePhase, and
 * a different gap-detection algorithm in the settings screen. These tests pin
 * the answers all three now share, including the inputs where they used to
 * disagree.
 */
import {
  countCompleteCycles,
  currentCycleState,
  cycleStats,
  determinePhase,
  groupFlowIntoCycles,
  calculateCycleVariation,
} from "@/services/cyclePredictionLogic";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";
import type { DayData } from "@/constants/Interfaces";

function day(
  id: number,
  date: string,
  flow: number,
  opts?: { is_cycle_start?: boolean; is_cycle_end?: boolean },
): DayData {
  return { id, date, flow_intensity: flow, ...opts };
}

/** A run of `length` flow days starting at `startDay` of January 2026. */
function run(startId: number, startDay: number, length: number): DayData[] {
  return Array.from({ length }, (_, i) =>
    day(startId + i, `2026-01-${String(startDay + i).padStart(2, "0")}`, 2),
  );
}

const localDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

describe("groupFlowIntoCycles ignores days with no flow", () => {
  it("does not let a zero-flow day bridge two cycles", () => {
    // The private copy in useCyclePhase filtered these out before grouping and
    // this one did not, so the two disagreed on exactly this input.
    const data: DayData[] = [
      day(1, "2026-01-01", 2),
      day(2, "2026-01-02", 2),
      day(3, "2026-01-03", 0),
      day(4, "2026-01-04", 2),
      day(5, "2026-01-05", 2),
    ];

    const cycles = groupFlowIntoCycles(data);

    expect(cycles).toHaveLength(2);
    expect(cycles[0].dates).toEqual(["2026-01-01", "2026-01-02"]);
    expect(cycles[1].dates).toEqual(["2026-01-04", "2026-01-05"]);
  });

  it("ignores days with no flow recorded at all", () => {
    const data: DayData[] = [
      day(1, "2026-01-01", 2),
      { id: 2, date: "2026-01-02", flow_intensity: 0, notes: "just a note" },
      day(3, "2026-01-03", 2),
    ];

    expect(groupFlowIntoCycles(data)).toHaveLength(2);
  });
});

describe("countCompleteCycles", () => {
  const minimum = CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS;

  it("counts runs that reach the minimum length", () => {
    expect(
      countCompleteCycles([...run(1, 1, minimum), ...run(10, 10, minimum)]),
    ).toBe(2);
  });

  it("does not count a run shorter than the minimum", () => {
    expect(countCompleteCycles(run(1, 1, minimum - 1))).toBe(0);
  });

  it("counts a manually marked cycle start as a new cycle", () => {
    // The settings screen's gap detection never consulted the markers, so it
    // saw one long run here and counted one cycle. This counts two.
    const data: DayData[] = [
      ...run(1, 1, 3),
      day(4, "2026-01-04", 2, { is_cycle_start: true }),
      ...run(5, 5, 2),
    ];

    expect(countCompleteCycles(data)).toBe(2);
  });

  it("counts a manually marked cycle end as ending a cycle", () => {
    const data: DayData[] = [
      day(1, "2026-01-01", 2),
      day(2, "2026-01-02", 2),
      day(3, "2026-01-03", 2, { is_cycle_end: true }),
      ...run(4, 4, 3),
    ];

    expect(countCompleteCycles(data)).toBe(2);
  });

  it("can count fewer cycles than gap detection did, when a marker splits a short run", () => {
    // Worth knowing: the settings screen's old algorithm saw one three-day run
    // here and counted 1. Honouring the marker splits it into a one-day and a
    // two-day run, neither long enough, so the answer is 0. A user who marked
    // a start mid-run can see their count fall and predictions switch off.
    const data: DayData[] = [
      day(1, "2026-01-01", 2),
      day(2, "2026-01-02", 2, { is_cycle_start: true }),
      day(3, "2026-01-03", 2),
    ];

    expect(countCompleteCycles(data)).toBe(0);
  });

  it("is zero for no flow at all", () => {
    expect(countCompleteCycles([])).toBe(0);
  });
});

describe("determinePhase", () => {
  it("puts the first days of a cycle in the menstrual phase", () => {
    expect(determinePhase(1, 28)).toBe("menstrual");
  });

  it("moves through follicular, ovulation and luteal", () => {
    const phases = Array.from({ length: 28 }, (_, i) =>
      determinePhase(i + 1, 28),
    );

    expect(phases[0]).toBe("menstrual");
    expect(new Set(phases)).toEqual(
      new Set(["menstrual", "follicular", "ovulation", "luteal"]),
    );
    expect(phases[27]).toBe("luteal");
  });

  it("shifts its boundaries with the cycle length", () => {
    // A longer cycle pushes ovulation later.
    const shortCycle = Array.from({ length: 21 }, (_, i) =>
      determinePhase(i + 1, 21),
    ).indexOf("ovulation");
    const longCycle = Array.from({ length: 35 }, (_, i) =>
      determinePhase(i + 1, 35),
    ).indexOf("ovulation");

    expect(longCycle).toBeGreaterThan(shortCycle);
  });
});

describe("currentCycleState", () => {
  const cycleWithFlow = [...run(1, 1, 5)];

  it("is null before any complete cycle is logged", () => {
    expect(
      currentCycleState(run(1, 1, 1), [], localDay("2026-01-20")),
    ).toBeNull();
  });

  it("counts the cycle day from the last cycle start", () => {
    const state = currentCycleState(cycleWithFlow, [], localDay("2026-01-11"));

    expect(state?.cycleDay).toBe(11);
    expect(state?.lastPeriodStart).toBe("2026-01-01");
  });

  it("takes the reference day as a parameter rather than reading the clock", () => {
    const early = currentCycleState(cycleWithFlow, [], localDay("2026-01-05"));
    const later = currentCycleState(cycleWithFlow, [], localDay("2026-01-15"));

    expect(early?.cycleDay).toBe(5);
    expect(later?.cycleDay).toBe(15);
  });

  it("calls today menstrual whenever flow is logged for today", () => {
    // The old code compared a UTC-formatted "today" against local date
    // strings, so after 5pm Pacific this check asked about tomorrow.
    const state = currentCycleState(cycleWithFlow, [], localDay("2026-01-03"));

    expect(state?.currentPhase).toBe("menstrual");
  });

  it("reports the next predicted start and its confidence", () => {
    const state = currentCycleState(
      cycleWithFlow,
      [{ date: "2026-02-01", confidence: 72 }],
      localDay("2026-01-11"),
    );

    expect(state?.nextPredictedStart).toBe("2026-02-01");
    expect(state?.confidence).toBe(72);
  });

  it("reports zero confidence when nothing is predicted", () => {
    const state = currentCycleState(cycleWithFlow, [], localDay("2026-01-11"));

    expect(state?.confidence).toBe(0);
    expect(state?.nextPredictedStart).toBeNull();
  });

  it("gates on the same count the settings screen uses", () => {
    const oneCycle = currentCycleState(
      cycleWithFlow,
      [],
      localDay("2026-01-11"),
    );

    expect(oneCycle?.hasEnoughData).toBe(
      countCompleteCycles(cycleWithFlow) >=
        CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION,
    );
  });
});

describe("cycleStats", () => {
  it("is null before any complete cycle is logged", () => {
    expect(cycleStats(run(1, 1, 1), 0)).toBeNull();
  });

  it("reports the same cycle count as countCompleteCycles", () => {
    const data = [...run(1, 1, 4), ...run(10, 10, 4)];

    expect(cycleStats(data, 0)?.totalCyclesTracked).toBe(
      countCompleteCycles(data),
    );
  });

  it("passes prediction accuracy straight through", () => {
    expect(cycleStats(run(1, 1, 4), 83)?.predictionAccuracy).toBe(83);
  });

  it("calls a cycle regular when variation is small", () => {
    const stats = cycleStats(run(1, 1, 4), 0);

    expect(stats?.cycleVariation).toBe(
      calculateCycleVariation(groupFlowIntoCycles(run(1, 1, 4))),
    );
    expect(stats?.isRegular).toBe(true);
  });
});
