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
import { getSetting, updateSetting } from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";

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
