/**
 * Proves the test seam itself: db/operations/* run against a real in-memory
 * SQLite database, with the production Expo handle substituted at the one
 * specifier every operations file reaches it through.
 */
import { eq } from "drizzle-orm";
import {
  getDatabase,
  getTestDatabase,
  resetTestDatabase,
} from "@/__tests__/helpers/testDatabase";
import { insertDay, getDay, getAllDays } from "@/db/operations/days";
import { days, moodEntries, moods } from "@/db/schema";

// Babel hoists this above every import above it, so the substitution is in
// place before the module-level `const db = getDrizzleDatabase()` inside each
// operations file evaluates. That is why no production code is injectable.
jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

beforeEach(() => {
  resetTestDatabase();
});

describe("the test seam", () => {
  it("applies every drizzle migration, including the ALTER in 0002", () => {
    const connection = getDatabase();
    const tables = (
      connection
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as { name: string }[]
    ).map((row) => row.name);

    expect(tables).toEqual([
      "days",
      "medication_entries",
      "medications",
      "mood_entries",
      "moods",
      "prediction_snapshots",
      "pregnancy_appointments",
      "pregnancy_days",
      "settings",
      "symptom_entries",
      "symptoms",
    ]);

    const dayColumns = (
      connection.prepare("PRAGMA table_info(days)").all() as { name: string }[]
    ).map((row) => row.name);

    expect(dayColumns).toContain("intercourse");
  });

  it("runs a real db/operations write and read", async () => {
    await insertDay("2026-03-01", 3, new Date(2026, 0, 1));

    const day = await getDay("2026-03-01");

    expect(day).toMatchObject({ date: "2026-03-01", flow_intensity: 3 });
  });

  it("enforces foreign keys, which the device does not", () => {
    const database = getTestDatabase();
    database.insert(days).values({ date: "2026-03-02" }).run();

    expect(() =>
      database.insert(moodEntries).values({ day_id: 999, mood_id: 999 }).run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it("accepts an entry once both parents exist", () => {
    const database = getTestDatabase();
    const [day] = database
      .insert(days)
      .values({ date: "2026-03-03" })
      .returning()
      .all();
    const [mood] = database
      .insert(moods)
      .values({ name: "Calm" })
      .returning()
      .all();

    database
      .insert(moodEntries)
      .values({ day_id: day.id, mood_id: mood.id })
      .run();

    const stored = database
      .select()
      .from(moodEntries)
      .where(eq(moodEntries.day_id, day.id))
      .all();

    expect(stored).toHaveLength(1);
  });

  it("isolates each test from the last", async () => {
    expect(await getAllDays()).toEqual([]);
  });
});
