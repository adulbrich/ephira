import { deleteAllMedicationEntries } from "@/db/operations/medicationEntries";
import { deleteAllMedications } from "@/db/operations/medications";
import { deleteAllMoodEntries } from "@/db/operations/moodEntries";
import { deleteAllMoods } from "@/db/operations/moods";
import { deleteAllSymptomEntries } from "@/db/operations/symptomEntries";
import { deleteAllSymptoms } from "@/db/operations/symptoms";
import { deleteAllDays } from "@/db/operations/days";
import { deleteAllSettings } from "@/db/operations/settings";
import { insertSymptom } from "@/db/operations/symptoms";
import { insertMood } from "@/db/operations/moods";
import { insertMedication } from "@/db/operations/medications";
import { symptomOptions } from "@/constants/Symptoms";
import { moodOptions } from "@/constants/Moods";
import { medicationOptions } from "@/constants/Medications";
import { birthControlOptions } from "@/constants/BirthControlTypes";
import { getSetting, updateSetting } from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";
import { getDrizzleDatabase } from "@/db/operations/setup";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { ExportData } from "@/constants/Interfaces";

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
          (med: any) => med.name === entry.medication_name,
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
          (bc: any) => bc.name === entry.medication_name,
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

export async function deleteAllDataInDatabase() {
  try {
    await deleteAllMedicationEntries();
    await deleteAllMedications();
    await deleteAllMoodEntries();
    await deleteAllMoods();
    await deleteAllSymptomEntries();
    await deleteAllSymptoms();
    await deleteAllDays();
    await deleteAllSettings();

    console.log("All database data has been deleted successfully.");
  } catch (error) {
    console.error("Error deleting database data:", error);
  }
}

// This is used the first time the app is opened to insert the default
// symptoms, moods, and medications into the database and adjust calendar filters
// to the new format if needed
export const setupEntryTypes = async () => {
  // delete old formats if neeed
  await deleteAllSymptoms();
  await deleteAllMoods();
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

  // update calendar filters
  const storedFilters = await getSetting(SettingsKeys.calendarFilters);
  let newFilters: string[] = [];

  if (storedFilters?.value) {
    const currentFilters = JSON.parse(storedFilters.value); // Parse the stored string

    for (const filter of currentFilters) {
      if (filter.label) {
        newFilters.push(filter.label);
      }
    }
    await updateSetting(
      SettingsKeys.calendarFilters,
      JSON.stringify(newFilters),
    );
  }
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
