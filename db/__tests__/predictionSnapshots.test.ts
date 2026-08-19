import {
  getPredictionAccuracy,
  savePredictions,
  checkPredictionAccuracy,
} from "@/db/operations/predictionSnapshots";
import { predictionSnapshots } from "@/db/schema";
import {
  getTestDatabase,
  resetTestDatabase,
} from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

// UTC, because savePredictions formats with toISOString, matching the
// convention services/cyclePredictionLogic.ts already uses for date strings.
const MARCH_1 = new Date("2026-03-01T00:00:00Z");
const MARCH_2 = new Date("2026-03-02T00:00:00Z");

const storedSnapshots = () =>
  getTestDatabase()
    .select()
    .from(predictionSnapshots)
    .orderBy(
      predictionSnapshots.prediction_made_date,
      predictionSnapshots.predicted_date,
    )
    .all();

beforeEach(() => {
  resetTestDatabase();
});

describe("savePredictions", () => {
  it("stores one row per predicted date", async () => {
    await savePredictions(
      [
        { date: "2026-03-20", confidence: 80 },
        { date: "2026-03-21", confidence: 75 },
      ],
      MARCH_1,
    );

    expect(storedSnapshots()).toHaveLength(2);
  });

  it("is idempotent: saving the same set twice changes nothing", async () => {
    const predictions = [
      { date: "2026-03-20", confidence: 80 },
      { date: "2026-03-21", confidence: 75 },
    ];

    await savePredictions(predictions, MARCH_1);
    const first = storedSnapshots();

    await savePredictions(predictions, MARCH_1);

    expect(storedSnapshots()).toEqual(first);
  });

  it("survives the calendar tapping that caused the defect", async () => {
    const predictions = [{ date: "2026-03-20", confidence: 80 }];

    for (let tap = 0; tap < 25; tap++) {
      await savePredictions(predictions, MARCH_1);
    }

    expect(storedSnapshots()).toHaveLength(1);
  });

  it("updates confidence in place when the same day predicts again", async () => {
    await savePredictions([{ date: "2026-03-20", confidence: 80 }], MARCH_1);
    await savePredictions([{ date: "2026-03-20", confidence: 55 }], MARCH_1);

    const stored = storedSnapshots();

    expect(stored).toHaveLength(1);
    expect(stored[0].confidence).toBe(55);
  });

  it("writes a new generation on a new day, preserving the time series", async () => {
    await savePredictions([{ date: "2026-03-20", confidence: 80 }], MARCH_1);
    await savePredictions([{ date: "2026-03-20", confidence: 90 }], MARCH_2);

    const stored = storedSnapshots();

    expect(stored).toHaveLength(2);
    expect(stored.map((row) => row.prediction_made_date)).toEqual([
      "2026-03-01",
      "2026-03-02",
    ]);
  });

  it("takes the prediction-made date from its caller, not the clock", async () => {
    await savePredictions([{ date: "2026-03-20", confidence: 80 }], MARCH_1);

    expect(storedSnapshots()[0].prediction_made_date).toBe("2026-03-01");
  });

  it("retracts same-day predictions that are no longer forecast", async () => {
    await savePredictions(
      [
        { date: "2026-03-20", confidence: 80 },
        { date: "2026-03-21", confidence: 75 },
      ],
      MARCH_1,
    );

    await savePredictions([{ date: "2026-03-21", confidence: 75 }], MARCH_1);

    expect(storedSnapshots().map((row) => row.predicted_date)).toEqual([
      "2026-03-21",
    ]);
  });

  it("never retracts a prediction whose outcome has already been measured", async () => {
    await savePredictions([{ date: "2026-03-20", confidence: 80 }], MARCH_1);
    await checkPredictionAccuracy("2026-03-20", true);

    await savePredictions([{ date: "2026-03-25", confidence: 60 }], MARCH_1);

    const stored = storedSnapshots();

    expect(stored.map((row) => row.predicted_date)).toEqual([
      "2026-03-20",
      "2026-03-25",
    ]);
    expect(stored[0].actual_had_flow).toBe(true);
  });

  it("leaves a measured outcome alone when confidence is updated", async () => {
    await savePredictions([{ date: "2026-03-20", confidence: 80 }], MARCH_1);
    await checkPredictionAccuracy("2026-03-20", true);

    await savePredictions([{ date: "2026-03-20", confidence: 40 }], MARCH_1);

    const [stored] = storedSnapshots();

    expect(stored.confidence).toBe(40);
    expect(stored.actual_had_flow).toBe(true);
  });

  it("keeps the accuracy metric from being skewed by repeated saves", async () => {
    const predictions = [
      { date: "2026-03-20", confidence: 80 },
      { date: "2026-03-21", confidence: 75 },
    ];

    for (let tap = 0; tap < 10; tap++) {
      await savePredictions(predictions, MARCH_1);
    }

    await checkPredictionAccuracy("2026-03-20", true);
    await checkPredictionAccuracy("2026-03-21", false);

    expect(await getPredictionAccuracy()).toEqual({
      totalChecked: 2,
      totalCorrect: 1,
      accuracyPercentage: 50,
    });
  });

  it("does nothing when given no predictions", async () => {
    await savePredictions([], MARCH_1);

    expect(storedSnapshots()).toEqual([]);
  });
});
