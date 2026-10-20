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
  getAllPregnancyDays,
  parseStoredNames,
} from "@/db/operations/pregnancyDays";
import { getAllPregnancyAppointments } from "@/db/operations/pregnancyAppointments";
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
import { eq } from "drizzle-orm";
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
      pregnancyDays: {},
      pregnancyAppointments: {},
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

    // Pregnancy mode's tables, whichever mode is on now: the privacy policy
    // tells people to export before they change phones, and a mode switched
    // off still has its rows. The Pregnancy Anchor in settings is not here.
    for (const day of await getAllPregnancyDays()) {
      exportData.pregnancyDays[day.date] = {
        kicks: day.kicks ?? undefined,
        symptoms: parseStoredNames(day.symptoms),
        moods: parseStoredNames(day.moods),
        notes: day.notes || undefined,
      };
    }

    for (const appointment of await getAllPregnancyAppointments()) {
      exportData.pregnancyAppointments[appointment.date] ??= [];
      exportData.pregnancyAppointments[appointment.date].push({
        title: appointment.title,
        type: appointment.type || undefined,
        notes: appointment.notes || undefined,
      });
    }

    return exportData;
  } catch (error) {
    console.error("Error fetching data from database:", error);
  }
}

/**
 * Seeds the default catalogue unless this database already has it: at launch,
 * and right after Delete Data, which replaces the file. Until
 * it is seeded the app offers nothing to log, and an entry logged under a name
 * the stale cache still showed is deleted by setupEntryTypes at the next launch.
 */
export async function seedCatalogueOnce() {
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
  // user's history simply stops joining.
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
