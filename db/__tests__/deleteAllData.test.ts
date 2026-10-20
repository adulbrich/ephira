import { getTableName, is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { deleteAllDataInDatabase } from "@/db/database";
import * as schema from "@/db/schema";
import {
  getDatabase,
  getTestDatabase,
  resetTestDatabase,
} from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

/** Every table declared in db/schema.ts, by its SQL name. */
const SCHEMA_TABLES = Object.values(schema).flatMap((value) =>
  is(value, SQLiteTable) ? [getTableName(value)] : [],
);

/**
 * Drizzle's record of which migrations have run. The device has it and the
 * test database does not, because the helper applies the .sql files itself.
 * Emptying it would make the next launch run every migration again.
 */
const MIGRATIONS_TABLE = "__drizzle_migrations";

/**
 * Rows in every table the database holds, read from sqlite_master rather
 * than from the schema, so a table nobody told this test about still counts.
 * `sqlite_sequence` is included: it keeps the highest id each table has
 * issued, which says how many days, appointments and so on there ever were.
 */
function rowCounts(): Record<string, number> {
  const connection = getDatabase();
  const names = connection
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all() as { name: string }[];

  return Object.fromEntries(
    names
      .filter(({ name }) => name !== MIGRATIONS_TABLE)
      .map(({ name }) => {
        const { count } = connection
          .prepare(`SELECT count(*) AS count FROM "${name}"`)
          .get() as { count: number };
        return [name, count];
      }),
  );
}

/** At least one row in every table in db/schema.ts. */
function seedEveryTable() {
  const db = getTestDatabase();

  const [day] = db
    .insert(schema.days)
    .values({ date: "2026-03-01", flow_intensity: 2, notes: "cramps" })
    .returning()
    .all();
  const [mood] = db
    .insert(schema.moods)
    .values({ name: "Calm" })
    .returning()
    .all();
  const [symptom] = db
    .insert(schema.symptoms)
    .values({ name: "Headache" })
    .returning()
    .all();
  const [medication] = db
    .insert(schema.medications)
    .values({ name: "Ibuprofen" })
    .returning()
    .all();

  db.insert(schema.moodEntries)
    .values({ day_id: day.id, mood_id: mood.id })
    .run();
  db.insert(schema.symptomEntries)
    .values({ day_id: day.id, symptom_id: symptom.id })
    .run();
  db.insert(schema.medicationEntries)
    .values({ day_id: day.id, medication_id: medication.id })
    .run();
  db.insert(schema.settings).values({ name: "password", value: "hash" }).run();
  db.insert(schema.settings)
    .values({ name: "databaseInitialSetup", value: "0000" })
    .run();
  db.insert(schema.predictionSnapshots)
    .values({
      prediction_made_date: "2026-03-01",
      predicted_date: "2026-03-29",
      confidence: 80,
    })
    .run();
  db.insert(schema.pregnancyDays)
    .values({ date: "2026-05-01", kicks: 4, notes: "first kicks" })
    .run();
  db.insert(schema.pregnancyAppointments)
    .values({ date: "2026-05-02", title: "Anatomy scan", type: "Ultrasound" })
    .run();
}

/** Tables a seeded database left empty, which would make the test vacuous. */
const emptyTables = (counts: Record<string, number>) =>
  Object.entries(counts)
    .filter(([, count]) => count === 0)
    .map(([name]) => name);

beforeEach(() => {
  resetTestDatabase();
});

describe("deleteAllDataInDatabase", () => {
  it("covers every table in the schema, and the schema covers the database", () => {
    const inDatabase = Object.keys(rowCounts()).filter(
      (name) => name !== "sqlite_sequence",
    );

    expect([...SCHEMA_TABLES].sort()).toEqual([...inDatabase].sort());
  });

  it("empties every table", async () => {
    seedEveryTable();
    expect(emptyTables(rowCounts())).toEqual([]);

    await deleteAllDataInDatabase();

    const counts = rowCounts();
    expect(emptyTables(counts).sort()).toEqual(Object.keys(counts).sort());
  });

  it.each(SCHEMA_TABLES)(
    "deletes nothing when %s cannot be emptied",
    async (failingTable) => {
      seedEveryTable();
      const before = rowCounts();
      const connection = getDatabase();
      connection.exec(
        `CREATE TEMP TRIGGER refuse_delete BEFORE DELETE ON "${failingTable}"
         BEGIN SELECT RAISE(ABORT, 'disk I/O error'); END`,
      );

      try {
        await expect(deleteAllDataInDatabase()).rejects.toThrow(
          "disk I/O error",
        );
      } finally {
        connection.exec("DROP TRIGGER refuse_delete");
      }

      expect(rowCounts()).toEqual(before);
    },
  );

  it("leaves no deleted rows in free pages", async () => {
    const db = getTestDatabase();
    for (let i = 0; i < 400; i++) {
      db.insert(schema.days)
        .values({ date: `day ${i}`, notes: "a note about the day ".repeat(25) })
        .run();
    }

    await deleteAllDataInDatabase();

    expect(getDatabase().pragma("freelist_count", { simple: true })).toBe(0);
  });

  it("keeps the record of which migrations have run", async () => {
    const connection = getDatabase();
    connection.exec(
      `CREATE TABLE "${MIGRATIONS_TABLE}" (id INTEGER PRIMARY KEY, hash text NOT NULL, created_at numeric)`,
    );

    try {
      connection
        .prepare(
          `INSERT INTO "${MIGRATIONS_TABLE}" (hash, created_at) VALUES (?, ?)`,
        )
        .run("0000_initial", 1);

      await deleteAllDataInDatabase();

      const { count } = connection
        .prepare(`SELECT count(*) AS count FROM "${MIGRATIONS_TABLE}"`)
        .get() as { count: number };
      expect(count).toBe(1);
    } finally {
      connection.exec(`DROP TABLE "${MIGRATIONS_TABLE}"`);
    }
  });
});
