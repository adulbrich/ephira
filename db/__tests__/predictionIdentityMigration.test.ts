import {
  applyMigration,
  getDatabase,
  getTestDatabase,
  resetTestDatabase,
} from "@/__tests__/helpers/testDatabase";
import { predictionSnapshots } from "@/db/schema";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const IDENTITY = "0005_prediction_snapshot_identity";

/** Duplicates of the kind the unconditional insert left on every device. */
function seedDuplicates() {
  const db = getTestDatabase();
  const rows = [
    {
      prediction_made_date: "2026-03-01",
      predicted_date: "2026-03-20",
      confidence: 60,
    },
    {
      prediction_made_date: "2026-03-01",
      predicted_date: "2026-03-20",
      confidence: 70,
    },
    {
      prediction_made_date: "2026-03-01",
      predicted_date: "2026-03-20",
      confidence: 85,
    },
    {
      prediction_made_date: "2026-03-01",
      predicted_date: "2026-03-21",
      confidence: 50,
    },
    {
      prediction_made_date: "2026-03-02",
      predicted_date: "2026-03-20",
      confidence: 90,
    },
  ];
  for (const row of rows) {
    db.insert(predictionSnapshots).values(row).run();
  }
}

const stored = () =>
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
  // The seam applies every migration on open, so the index is already there
  // and duplicates cannot be written. Drop it to reproduce a device that has
  // been accumulating them.
  getDatabase().exec(
    "DROP INDEX IF EXISTS prediction_snapshots_generation_unique",
  );
});

describe("the prediction snapshot identity migration", () => {
  it("cannot create the index while duplicates exist", () => {
    seedDuplicates();

    expect(() =>
      getDatabase().exec(
        "CREATE UNIQUE INDEX prediction_snapshots_generation_unique ON prediction_snapshots (prediction_made_date, predicted_date)",
      ),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it("dedupes first, so the index can be created", () => {
    seedDuplicates();

    expect(() => applyMigration(IDENTITY)).not.toThrow();
  });

  it("keeps one row per (made date, predicted date)", () => {
    seedDuplicates();

    applyMigration(IDENTITY);

    expect(
      stored().map((r) => [r.prediction_made_date, r.predicted_date]),
    ).toEqual([
      ["2026-03-01", "2026-03-20"],
      ["2026-03-01", "2026-03-21"],
      ["2026-03-02", "2026-03-20"],
    ]);
  });

  it("keeps the newest row, so the latest confidence survives", () => {
    seedDuplicates();

    applyMigration(IDENTITY);

    expect(stored()[0].confidence).toBe(85);
  });

  it("preserves separate generations of the same predicted date", () => {
    seedDuplicates();

    applyMigration(IDENTITY);

    expect(
      stored().filter((r) => r.predicted_date === "2026-03-20"),
    ).toHaveLength(2);
  });

  it("runs cleanly on a database with nothing in it", () => {
    expect(() => applyMigration(IDENTITY)).not.toThrow();
  });

  it("leaves the identity enforced by the schema afterwards", () => {
    seedDuplicates();

    applyMigration(IDENTITY);

    expect(() =>
      getTestDatabase()
        .insert(predictionSnapshots)
        .values({
          prediction_made_date: "2026-03-01",
          predicted_date: "2026-03-20",
          confidence: 10,
        })
        .run(),
    ).toThrow(/UNIQUE constraint failed/);
  });
});
