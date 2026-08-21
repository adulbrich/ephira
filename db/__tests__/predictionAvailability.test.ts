import {
  applyPredictionChoice,
  predictionAvailability,
  reconcilePredictionChoice,
} from "@/services/predictionAvailability";
import { insertDay } from "@/db/operations/days";
import { getAllDays } from "@/db/database";
import {
  loadCalendarFilters,
  loadCyclePredictionChoice,
} from "@/db/preferences";
import { PREDICTION_FILTER, changeFilters } from "@/db/selectedFilters";
import type { DayData } from "@/constants/Interfaces";
import { resetTestDatabase } from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

jest.mock("@/services/notificationService", () => ({
  NotificationService: {
    scheduleAllPredictionNotifications: jest.fn(),
  },
}));

const REFERENCE_DAY = new Date(2026, 2, 15);

/** Two clean cycles, enough for a Prediction. */
async function logTwoCycles() {
  for (const date of ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]) {
    await insertDay(date, 3, REFERENCE_DAY);
  }
  for (const date of ["2026-01-29", "2026-01-30", "2026-01-31", "2026-02-01"]) {
    await insertDay(date, 3, REFERENCE_DAY);
  }
}

/** Take the flow back off every Day, leaving the rows in place. */
async function clearAllFlow() {
  for (const day of await getAllDays()) {
    await insertDay(day.date, 0, REFERENCE_DAY);
  }
}

const flowDays = async (): Promise<DayData[]> =>
  (await getAllDays()).filter((day) => day.flow_intensity) as DayData[];

beforeEach(() => {
  resetTestDatabase();
});

describe("predictionAvailability", () => {
  it("says nothing is logged yet when there is no flow", () => {
    expect(predictionAvailability([])).toEqual({
      cycleCount: 0,
      hasEnough: false,
      message: "No flow data logged yet. Start logging to enable predictions!",
    });
  });

  it("counts complete cycles and says how many more are needed", async () => {
    for (const date of [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]) {
      await insertDay(date, 3, REFERENCE_DAY);
    }

    expect(predictionAvailability(await flowDays())).toEqual({
      cycleCount: 1,
      hasEnough: false,
      message: "You have 1 cycle. Log 1 more complete cycle for predictions.",
    });
  });

  it("pluralises both counts", async () => {
    // Two flow days is below MIN_CONSECUTIVE_DAYS, so it is not a Cycle yet.
    for (const date of ["2026-01-01", "2026-01-02"]) {
      await insertDay(date, 3, REFERENCE_DAY);
    }

    expect(predictionAvailability(await flowDays()).message).toBe(
      "You have 0 cycles. Log 2 more complete cycles for predictions.",
    );
  });

  it("is available once two complete cycles are logged", async () => {
    await logTwoCycles();

    expect(predictionAvailability(await flowDays())).toEqual({
      cycleCount: 2,
      hasEnough: true,
      message: "Great! You have 2 complete cycles logged.",
    });
  });

  it("counts through the one definition of a Cycle, markers included", async () => {
    // One eight-day run, split in two by a cycle start the user marked. Gap
    // detection alone sees one Cycle; the shared definition sees two.
    for (const date of [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
    ]) {
      await insertDay(date, 3, REFERENCE_DAY);
    }
    await insertDay("2026-01-05", 3, REFERENCE_DAY, undefined, true, false);

    expect(predictionAvailability(await flowDays()).cycleCount).toBe(2);
  });
});

describe("applyPredictionChoice", () => {
  it("turning it on records the choice and adds the filter", async () => {
    await logTwoCycles();

    const result = await applyPredictionChoice({
      choice: true,
      filters: ["Flow"],
      referenceDay: REFERENCE_DAY,
    });

    expect(result.filters).toEqual(["Flow", PREDICTION_FILTER]);
    expect(await loadCyclePredictionChoice()).toBe(true);
    expect(await loadCalendarFilters()).toEqual(["Flow", PREDICTION_FILTER]);
    expect(result.predictions.length).toBeGreaterThan(0);
  });

  it("turning it off records the choice, drops the filter and clears the forecast", async () => {
    await logTwoCycles();
    const on = await changeFilters(["Flow"], { add: PREDICTION_FILTER });

    const result = await applyPredictionChoice({
      choice: false,
      filters: on,
      referenceDay: REFERENCE_DAY,
    });

    expect(result.filters).toEqual(["Flow"]);
    expect(result.predictions).toEqual([]);
    expect(await loadCyclePredictionChoice()).toBe(false);
    expect(await loadCalendarFilters()).toEqual(["Flow"]);
  });
});

describe("reconcilePredictionChoice", () => {
  it("leaves a supported choice alone", async () => {
    await logTwoCycles();
    const filters = await changeFilters(["Flow"], { add: PREDICTION_FILTER });

    const result = await reconcilePredictionChoice({
      choice: true,
      filters,
      referenceDay: REFERENCE_DAY,
    });

    expect(result.revoked).toBe(false);
    expect(result.availability.hasEnough).toBe(true);
    expect(await loadCyclePredictionChoice()).toBe(true);
    expect(await loadCalendarFilters()).toEqual(["Flow", PREDICTION_FILTER]);
  });

  it("revokes the choice durably when the data stops supporting it", async () => {
    // The rule that silently takes away something the user turned on. It ran
    // inside a render effect and there was nowhere to assert it.
    await logTwoCycles();
    const filters = await applyPredictionChoice({
      choice: true,
      filters: ["Flow"],
      referenceDay: REFERENCE_DAY,
    }).then((r) => r.filters);

    await clearAllFlow();

    const result = await reconcilePredictionChoice({
      choice: true,
      filters,
      referenceDay: REFERENCE_DAY,
    });

    expect(result.revoked).toBe(true);
    expect(result.availability.hasEnough).toBe(false);
    // Both halves survive a restart, which is the part that used to be missed.
    expect(await loadCyclePredictionChoice()).toBe(false);
    expect(await loadCalendarFilters()).toEqual(["Flow"]);
  });

  it("does not revoke a choice the user has already turned off", async () => {
    const result = await reconcilePredictionChoice({
      choice: false,
      filters: ["Flow"],
      referenceDay: REFERENCE_DAY,
    });

    expect(result.revoked).toBe(false);
    expect(result.availability.hasEnough).toBe(false);
  });
});
