import { insertDay } from "@/db/operations/days";
import { predictionSnapshots } from "@/db/schema";
import { refreshPredictions } from "@/services/cyclePredictions";
import {
  getTestDatabase,
  resetTestDatabase,
} from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const mockScheduleNotifications = jest.fn();
jest.mock("@/services/notificationService", () => ({
  NotificationService: {
    scheduleAllPredictionNotifications: (...args: unknown[]) =>
      mockScheduleNotifications(...args),
  },
}));

const REFERENCE_DAY = new Date(2026, 2, 15);

const stored = () =>
  getTestDatabase()
    .select()
    .from(predictionSnapshots)
    .orderBy(
      predictionSnapshots.prediction_made_date,
      predictionSnapshots.predicted_date,
    )
    .all();

/** Two clean cycles, enough for a prediction. */
async function logTwoCycles() {
  for (const date of ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]) {
    await insertDay(date, 3, REFERENCE_DAY);
  }
  for (const date of ["2026-01-29", "2026-01-30", "2026-01-31", "2026-02-01"]) {
    await insertDay(date, 3, REFERENCE_DAY);
  }
}

beforeEach(() => {
  resetTestDatabase();
  mockScheduleNotifications.mockClear();
});

describe("refreshPredictions", () => {
  it("predicts nothing when no flow has been logged", async () => {
    expect(await refreshPredictions(REFERENCE_DAY)).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it("predicts nothing from a single incomplete cycle", async () => {
    await insertDay("2026-03-01", 2, new Date(2026, 0, 1));

    expect(await refreshPredictions(REFERENCE_DAY)).toEqual([]);
  });

  it("returns future predictions and stores them", async () => {
    await logTwoCycles();

    const predictions = await refreshPredictions(REFERENCE_DAY);

    expect(predictions.length).toBeGreaterThan(0);
    expect(stored().length).toBe(predictions.length);
  });

  it("only predicts dates after the reference day", async () => {
    await logTwoCycles();

    const predictions = await refreshPredictions(REFERENCE_DAY);

    for (const prediction of predictions) {
      expect(prediction.date > "2026-03-15").toBe(true);
    }
  });

  it("running it twice changes nothing", async () => {
    await logTwoCycles();

    await refreshPredictions(REFERENCE_DAY);
    const afterFirst = stored();

    await refreshPredictions(REFERENCE_DAY);

    expect(stored()).toEqual(afterFirst);
  });

  it("survives being called on every calendar tap", async () => {
    await logTwoCycles();

    for (let tap = 0; tap < 20; tap++) {
      await refreshPredictions(REFERENCE_DAY);
    }
    const afterMany = stored();

    await refreshPredictions(REFERENCE_DAY);

    expect(stored()).toEqual(afterMany);
  });

  it("stamps the snapshots with the reference day it was given", async () => {
    await logTwoCycles();

    await refreshPredictions(REFERENCE_DAY);

    for (const row of stored()) {
      expect(row.prediction_made_date).toBe("2026-03-15");
    }
  });

  it("writes a new generation on a later day", async () => {
    await logTwoCycles();

    await refreshPredictions(REFERENCE_DAY);
    const firstGeneration = stored().length;

    await refreshPredictions(new Date(2026, 2, 16));

    expect(new Set(stored().map((row) => row.prediction_made_date))).toEqual(
      new Set(["2026-03-15", "2026-03-16"]),
    );
    expect(stored().length).toBeGreaterThan(firstGeneration);
  });

  it("schedules notifications for what it predicted", async () => {
    await logTwoCycles();

    const predictions = await refreshPredictions(REFERENCE_DAY);

    expect(mockScheduleNotifications).toHaveBeenCalledWith(predictions);
  });

  it("does not schedule notifications when there is nothing to predict", async () => {
    await refreshPredictions(REFERENCE_DAY);

    expect(mockScheduleNotifications).not.toHaveBeenCalled();
  });

  it("still returns its predictions if scheduling notifications fails", async () => {
    await logTwoCycles();
    mockScheduleNotifications.mockRejectedValueOnce(
      new Error("no notification permission"),
    );

    const predictions = await refreshPredictions(REFERENCE_DAY);

    expect(predictions.length).toBeGreaterThan(0);
  });
});
