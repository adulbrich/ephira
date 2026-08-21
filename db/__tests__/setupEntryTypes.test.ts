import { setupEntryTypes } from "@/db/database";
import { getSetting, insertSetting } from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";
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

/** What is actually on disk for the calendar filters. */
async function storedFilters(): Promise<string[] | null> {
  const stored = await getSetting(SettingsKeys.calendarFilters);
  return stored?.value ? JSON.parse(stored.value) : null;
}

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

describe("the legacy calendar filter conversion", () => {
  // setupEntryTypes carries a one-time conversion from the old filter format,
  // where a filter was an object with a `label`, to the plain strings used now.
  it("converts filters still stored in the old object format", async () => {
    await insertSetting(
      SettingsKeys.calendarFilters,
      JSON.stringify([{ label: "Flow" }, { label: "Notes" }]),
    );

    await setupEntryTypes();

    expect(await storedFilters()).toEqual(["Flow", "Notes"]);
  });

  it("leaves filters already in the current format alone", async () => {
    // This wiped them. Every entry is a string, so `filter.label` is undefined
    // for all of them, the converted list came out empty, and it was written
    // back over the real one. It only stayed hidden because the shell's
    // hydration used to reject before anything was ever stored -- fixing that
    // is what exposed it, and a new user's default filters were the first
    // casualty.
    await insertSetting(
      SettingsKeys.calendarFilters,
      JSON.stringify(["Flow", "Any Birth Control"]),
    );

    await setupEntryTypes();

    expect(await storedFilters()).toEqual(["Flow", "Any Birth Control"]);
  });

  it("leaves an empty selection alone", async () => {
    await insertSetting(SettingsKeys.calendarFilters, JSON.stringify([]));

    await setupEntryTypes();

    expect(await storedFilters()).toEqual([]);
  });

  it("writes nothing when no filters are stored", async () => {
    await setupEntryTypes();

    expect(await getSetting(SettingsKeys.calendarFilters)).toBeUndefined();
  });
});
