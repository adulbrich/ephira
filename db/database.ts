import { deleteAllMedicationEntries } from "@/db/operations/medicationEntries";
import {
  deleteAllMedications,
  insertMedication,
} from "@/db/operations/medications";
import { deleteAllMoodEntries } from "@/db/operations/moodEntries";
import { deleteAllMoods, insertMood } from "@/db/operations/moods";
import { deleteAllSymptomEntries } from "@/db/operations/symptomEntries";
import { deleteAllSymptoms, insertSymptom } from "@/db/operations/symptoms";
import {
  getSetting,
  insertSetting,
  updateSetting,
} from "@/db/operations/settings";
import { symptomOptions } from "@/constants/Symptoms";
import { moodOptions } from "@/constants/Moods";
import { medicationOptions } from "@/constants/Medications";
import { birthControlOptions } from "@/constants/BirthControlTypes";
import { SettingsKeys } from "@/constants/Settings";
import { getDrizzleDatabase } from "@/db/operations/setup";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type { ExportData } from "@/constants/Interfaces";

const db = getDrizzleDatabase();

export async function getAllDataAsJson() {
  try {
    const joinedEntries = await db
      .select({
        date: schema.days.date,
        flow_intensity: schema.days.flow_intensity,
        notes: schema.days.notes,
        mood_name: schema.moods.name,
        symptom_name: schema.symptoms.name,
        medication_name: schema.medications.name,
        medication_type: schema.medications.type,
        medication_time: schema.medicationEntries.time_taken,
        medication_notes: schema.medicationEntries.notes,
      })
      .from(schema.days)
      .leftJoin(
        schema.moodEntries,
        eq(schema.moodEntries.day_id, schema.days.id),
      )
      .leftJoin(schema.moods, eq(schema.moods.id, schema.moodEntries.mood_id))
      .leftJoin(
        schema.symptomEntries,
        eq(schema.symptomEntries.day_id, schema.days.id),
      )
      .leftJoin(
        schema.symptoms,
        eq(schema.symptoms.id, schema.symptomEntries.symptom_id),
      )
      .leftJoin(
        schema.medicationEntries,
        eq(schema.medicationEntries.day_id, schema.days.id),
      )
      .leftJoin(
        schema.medications,
        eq(schema.medications.id, schema.medicationEntries.medication_id),
      )
      .orderBy(schema.days.date);

    // organize and group all entries by date
    const exportData: ExportData = {
      headers: {
        base_header: ["Date", "Flow Intensity", "Notes"],
        moods: [],
        symptoms: [],
        medications: [],
        birth_control: [],
      },
      dailyData: {},
    };

    for (const entry of joinedEntries) {
      if (!exportData.dailyData[entry.date]) {
        exportData.dailyData[entry.date] = {
          date: entry.date,
          flow_intensity: entry.flow_intensity || 0,
          notes: entry.notes || "",
          moods: [],
          symptoms: [],
          medications: [],
          birth_control: [],
        };
      }

      if (
        entry.mood_name &&
        !exportData.dailyData[entry.date].moods.includes(entry.mood_name)
      ) {
        exportData.dailyData[entry.date].moods.push(entry.mood_name);

        if (!exportData.headers.moods.includes(entry.mood_name)) {
          exportData.headers.moods.push(entry.mood_name);
        }
      }
      if (
        entry.symptom_name &&
        !exportData.dailyData[entry.date].symptoms.includes(entry.symptom_name)
      ) {
        exportData.dailyData[entry.date].symptoms.push(entry.symptom_name);

        if (!exportData.headers.symptoms.includes(entry.symptom_name)) {
          exportData.headers.symptoms.push(entry.symptom_name);
        }
      }
      if (
        entry.medication_name &&
        entry.medication_type !== "birth control" &&
        !exportData.dailyData[entry.date].medications.some(
          (med) => med.name === entry.medication_name,
        )
      ) {
        exportData.dailyData[entry.date].medications.push({
          name: entry.medication_name,
          time_taken: entry.medication_time || undefined,
          notes: entry.medication_notes || undefined,
        });

        if (!exportData.headers.medications.includes(entry.medication_name)) {
          exportData.headers.medications.push(entry.medication_name);
        }
      }

      if (
        entry.medication_name &&
        entry.medication_type === "birth control" &&
        !exportData.dailyData[entry.date].birth_control.some(
          (bc) => bc.name === entry.medication_name,
        )
      ) {
        exportData.dailyData[entry.date].birth_control.push({
          name: entry.medication_name,
          time_taken: entry.medication_time || undefined,
          notes: entry.medication_notes || undefined,
        });

        if (!exportData.headers.birth_control.includes(entry.medication_name)) {
          exportData.headers.birth_control.push(entry.medication_name);
        }
      }
    }

    return exportData;
  } catch (error) {
    console.error("Error fetching data from database:", error);
  }
}

/**
 * Every table that holds what the user stored, children before parents, since
 * foreign keys are on in tests.
 *
 * A list rather than every table in sqlite_master: the device also has
 * drizzle's __drizzle_migrations, and emptying it would make the next launch
 * run every migration again. db/__tests__/deleteAllData.test.ts fails when a
 * table in db/schema.ts is missing here.
 */
const TABLES_CHILDREN_FIRST: SQLiteTable[] = [
  schema.medicationEntries,
  schema.moodEntries,
  schema.symptomEntries,
  schema.medications,
  schema.moods,
  schema.symptoms,
  schema.days,
  schema.predictionSnapshots,
  schema.pregnancyDays,
  schema.pregnancyAppointments,
  schema.settings,
];

/**
 * Deletes every row the app has stored, or none, and rejects if it could not.
 *
 * One transaction, so a failure or a kill part-way leaves the database as it
 * was. Before it was one, a kill after the catalogue went but before settings
 * did left databaseInitialSetup saying a catalogue had been seeded, and none
 * ever was again. The callback is synchronous because both drivers are: the
 * expo-sqlite one commits as soon as the callback returns, awaited or not.
 *
 * secure_delete is on, so SQLite overwrites what it deletes with zeros instead
 * of leaving it in free pages. VACUUM afterwards
 * rebuilds the file, which also drops what earlier, ordinary deletes left
 * there. It rewrites the whole file through the journal, so a nearly full disk
 * refuses it; the delete stands then, and is not reported as failed, since a
 * retry on the same disk would fail the same way.
 */
export async function deleteAllDataInDatabase() {
  // SQLCipher builds have it on already; this does not rely on that. all, not
  // run: the pragma answers with a row, expo-sqlite's run stops at that row,
  // and a statement left mid-step makes SQLite refuse the VACUUM below.
  db.all(sql`PRAGMA secure_delete = ON`);
  db.transaction((tx) => {
    for (const table of TABLES_CHILDREN_FIRST) {
      // A DELETE with no WHERE empties the table without visiting its rows,
      // so the update hook expo-sqlite's change listener rests on never fires
      // and useLiveQuery screens keep drawing what was deleted (38e0064 met
      // this on the calendar). One row deleted by key reports the table as
      // changed; the rest then go at once.
      tx.run(
        sql`DELETE FROM ${table} WHERE rowid IN (SELECT rowid FROM ${table} LIMIT 1)`,
      );
      tx.delete(table).run();
    }
    // The highest id each table has issued, which still counts what there was.
    tx.run(sql`DELETE FROM sqlite_sequence`);
  });
  try {
    db.run(sql`VACUUM`);
  } catch (error) {
    console.error("Deleted every row, but VACUUM failed:", error);
  }
}

/**
 * Seeds the default catalogue unless this database already has it: at launch,
 * and right after Delete Data, which empties it with everything else. Until
 * it is seeded the app offers nothing to log, and an entry logged under a name
 * the stale cache still showed is deleted by setupEntryTypes at the next launch.
 */
export async function seedEntryTypesOnce() {
  const isDatabaseSetup = await getSetting(SettingsKeys.databaseInitialSetup);
  if (isDatabaseSetup?.value === "0000") return;
  await setupEntryTypes();
  await insertSetting(SettingsKeys.databaseInitialSetup, "0000");
}

// This is used the first time the app is opened to insert the default
// symptoms, moods, and medications into the database and adjust calendar filters
// to the new format if needed
export const setupEntryTypes = async () => {
  // Delete old formats if needed. Children before parents: symptom_entries,
  // mood_entries and medication_entries reference these rows, and clearing the
  // catalogue without them leaves entries pointing at ids that no longer
  // exist. On device foreign keys are off, so that failure is silent and the
  // user's history simply stops joining. deleteAllDataInDatabase above has
  // always had this order; this function did not.
  await deleteAllSymptomEntries();
  await deleteAllSymptoms();
  await deleteAllMoodEntries();
  await deleteAllMoods();
  await deleteAllMedicationEntries();
  await deleteAllMedications();

  // insert all entry types
  for (const symptom of symptomOptions) {
    await insertSymptom(symptom, true);
  }
  for (const mood of moodOptions) {
    await insertMood(mood, true);
  }
  for (const medication of medicationOptions) {
    await insertMedication(medication, true);
  }
  for (const birthControl of birthControlOptions) {
    await insertMedication(birthControl, true, "birth control");
  }

  // Convert calendar filters still stored in the old format, where a filter was
  // an object with a `label` rather than the plain string used now.
  //
  // The conversion used to run against whatever was stored, not only against
  // the old format. Every entry in a current list is a string, so `filter.label`
  // was undefined for all of them, the converted list came out empty, and it
  // was written back over the real one. It stayed hidden because the app shell
  // read this setting before migrations had created the table, so the read
  // rejected and nothing was ever stored for this to destroy.
  const storedFilters = await getSetting(SettingsKeys.calendarFilters);
  if (!storedFilters?.value) return;

  let currentFilters: unknown;
  try {
    currentFilters = JSON.parse(storedFilters.value);
  } catch {
    return; // a corrupt preference is not this function's to repair
  }

  if (!Array.isArray(currentFilters)) return;

  const isLegacyFilter = (filter: unknown): filter is { label: string } =>
    typeof filter === "object" &&
    filter !== null &&
    typeof (filter as { label?: unknown }).label === "string";

  if (!currentFilters.some(isLegacyFilter)) return;

  await updateSetting(
    SettingsKeys.calendarFilters,
    JSON.stringify(currentFilters.filter(isLegacyFilter).map((f) => f.label)),
  );
};

export * from "@/db/operations/settings";
export * from "@/db/operations/setup";
export * from "@/db/operations/days";
export * from "@/db/operations/moods";
export * from "@/db/operations/moodEntries";
export * from "@/db/operations/medications";
export * from "@/db/operations/medicationEntries";
export * from "@/db/operations/symptoms";
export * from "@/db/operations/symptomEntries";
export * from "@/db/operations/predictionSnapshots";
export * from "@/db/operations/pregnancyDays";
export * from "@/db/operations/pregnancyAppointments";
