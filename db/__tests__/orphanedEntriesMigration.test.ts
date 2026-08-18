import {
  applyMigration,
  getDatabase,
  getTestDatabase,
  resetTestDatabase,
  withForeignKeysOff,
} from "@/__tests__/helpers/testDatabase";
import {
  days,
  medicationEntries,
  medications,
  moodEntries,
  moods,
  symptomEntries,
  symptoms,
} from "@/db/schema";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

const ORPHAN_CLEANUP = "0004_orphaned_entries_cleanup";

/**
 * Reproduces what an upgrading user's database looks like after
 * setupEntryTypes cleared the catalogue without clearing the entries: rows
 * that reference catalogue ids which no longer exist. Foreign keys go off to
 * write them, because that is the state the device was in when it happened.
 */
function seedOrphansAlongsideLiveEntries() {
  const db = getTestDatabase();

  const [day] = db
    .insert(days)
    .values({ date: "2026-03-01" })
    .returning()
    .all();
  const [mood] = db.insert(moods).values({ name: "Calm" }).returning().all();
  const [symptom] = db
    .insert(symptoms)
    .values({ name: "Cramps" })
    .returning()
    .all();
  const [medication] = db
    .insert(medications)
    .values({ name: "Ibuprofen" })
    .returning()
    .all();

  db.insert(moodEntries).values({ day_id: day.id, mood_id: mood.id }).run();
  db.insert(symptomEntries)
    .values({ day_id: day.id, symptom_id: symptom.id })
    .run();
  db.insert(medicationEntries)
    .values({ day_id: day.id, medication_id: medication.id })
    .run();

  withForeignKeysOff(() => {
    db.insert(moodEntries).values({ day_id: day.id, mood_id: 9001 }).run();
    db.insert(symptomEntries)
      .values({ day_id: day.id, symptom_id: 9002 })
      .run();
    db.insert(medicationEntries)
      .values({ day_id: day.id, medication_id: 9003 })
      .run();
  });
}

beforeEach(() => {
  resetTestDatabase();
});

describe("the orphaned entries cleanup migration", () => {
  it("deletes entries whose catalogue item is gone", () => {
    seedOrphansAlongsideLiveEntries();

    applyMigration(ORPHAN_CLEANUP);

    const db = getTestDatabase();
    expect(
      db
        .select()
        .from(moodEntries)
        .all()
        .map((e) => e.mood_id),
    ).toEqual([1]);
    expect(
      db
        .select()
        .from(symptomEntries)
        .all()
        .map((e) => e.symptom_id),
    ).toEqual([1]);
    expect(
      db
        .select()
        .from(medicationEntries)
        .all()
        .map((e) => e.medication_id),
    ).toEqual([1]);
  });

  it("leaves entries that still resolve alone", () => {
    seedOrphansAlongsideLiveEntries();

    applyMigration(ORPHAN_CLEANUP);

    const db = getTestDatabase();
    expect(db.select().from(moodEntries).all()).toHaveLength(1);
    expect(db.select().from(days).all()).toHaveLength(1);
    expect(db.select().from(moods).all()).toHaveLength(1);
  });

  it("is safe to run against a database with nothing in it", () => {
    expect(() => applyMigration(ORPHAN_CLEANUP)).not.toThrow();
  });

  it("is idempotent", () => {
    seedOrphansAlongsideLiveEntries();

    applyMigration(ORPHAN_CLEANUP);
    const afterFirst = getTestDatabase().select().from(moodEntries).all();
    applyMigration(ORPHAN_CLEANUP);

    expect(getTestDatabase().select().from(moodEntries).all()).toEqual(
      afterFirst,
    );
  });

  it("leaves the database able to take the foreign keys again", () => {
    seedOrphansAlongsideLiveEntries();

    applyMigration(ORPHAN_CLEANUP);

    const violations = getDatabase().prepare("PRAGMA foreign_key_check").all();

    expect(violations).toEqual([]);
  });
});
