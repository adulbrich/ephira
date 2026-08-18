import { setupEntryTypes } from "@/db/database";
import {
  days,
  medicationEntries,
  medications,
  moodEntries,
  moods,
  symptomEntries,
  symptoms,
} from "@/db/schema";
import {
  getTestDatabase,
  resetTestDatabase,
} from "@/__tests__/helpers/testDatabase";

jest.mock("@/db/operations/setup", () =>
  jest.requireActual("@/__tests__/helpers/testDatabase"),
);

/**
 * Stands in for an upgrading user's database: a logged day with a mood, a
 * symptom and a medication recorded against catalogue entries from the
 * previous release.
 */
function seedAPopulatedDatabase() {
  const db = getTestDatabase();

  const [day] = db
    .insert(days)
    .values({ date: "2026-03-01" })
    .returning()
    .all();
  const [mood] = db
    .insert(moods)
    .values({ name: "A mood from an older release" })
    .returning()
    .all();
  const [symptom] = db
    .insert(symptoms)
    .values({ name: "A symptom from an older release" })
    .returning()
    .all();
  const [medication] = db
    .insert(medications)
    .values({ name: "A medication from an older release" })
    .returning()
    .all();

  db.insert(moodEntries).values({ day_id: day.id, mood_id: mood.id }).run();
  db.insert(symptomEntries)
    .values({ day_id: day.id, symptom_id: symptom.id })
    .run();
  db.insert(medicationEntries)
    .values({ day_id: day.id, medication_id: medication.id })
    .run();
}

beforeEach(() => {
  resetTestDatabase();
});

describe("setupEntryTypes on an already-populated database", () => {
  it("does not fail", async () => {
    seedAPopulatedDatabase();

    await expect(setupEntryTypes()).resolves.not.toThrow();
  });

  it("leaves no entry row pointing at a catalogue item that is gone", async () => {
    seedAPopulatedDatabase();

    await setupEntryTypes();

    const db = getTestDatabase();
    const liveMoodIds = new Set(
      db
        .select()
        .from(moods)
        .all()
        .map((m) => m.id),
    );
    const liveSymptomIds = new Set(
      db
        .select()
        .from(symptoms)
        .all()
        .map((s) => s.id),
    );
    const liveMedicationIds = new Set(
      db
        .select()
        .from(medications)
        .all()
        .map((m) => m.id),
    );

    expect(
      db
        .select()
        .from(moodEntries)
        .all()
        .filter((e) => !liveMoodIds.has(e.mood_id)),
    ).toEqual([]);
    expect(
      db
        .select()
        .from(symptomEntries)
        .all()
        .filter((e) => !liveSymptomIds.has(e.symptom_id)),
    ).toEqual([]);
    expect(
      db
        .select()
        .from(medicationEntries)
        .all()
        .filter((e) => !liveMedicationIds.has(e.medication_id)),
    ).toEqual([]);
  });

  it("still replaces the catalogue with the current defaults", async () => {
    seedAPopulatedDatabase();

    await setupEntryTypes();

    const db = getTestDatabase();
    const moodNames = db
      .select()
      .from(moods)
      .all()
      .map((m) => m.name);

    expect(moodNames).not.toContain("A mood from an older release");
    expect(moodNames.length).toBeGreaterThan(0);
  });

  it("leaves the logged days themselves alone", async () => {
    seedAPopulatedDatabase();

    await setupEntryTypes();

    expect(
      getTestDatabase()
        .select()
        .from(days)
        .all()
        .map((d) => d.date),
    ).toEqual(["2026-03-01"]);
  });
});
