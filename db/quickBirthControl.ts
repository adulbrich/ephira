import { getDay, insertDay } from "@/db/operations/days";
import {
  getMedicationEntriesForDay,
  insertMedicationEntry,
} from "@/db/operations/medicationEntries";
import { getMedication } from "@/db/operations/medications";
import { getSetting } from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";
import { birthControlOptions } from "@/constants/BirthControlTypes";

export const LONG_TERM_BC_TYPES = ["IUD", "Implant"];

const todayISO = () => {
  const day = new Date();
  const offset = day.getTimezoneOffset();
  const localDate = new Date(day.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

// get the user's configured BC type from settings, or null if none set
export async function getActiveBirthControlType(): Promise<string | null> {
  const setting = await getSetting(SettingsKeys.activeBirthControlType);
  const value = setting?.value ?? null;
  if (value && birthControlOptions.includes(value)) return value;
  return null;
}

// check if birth control was already logged today, return its name or null
export async function getTodaysBirthControlName(): Promise<string | null> {
  const date = todayISO();
  const day = await getDay(date);
  if (!day?.id) return null;

  const todaysEntries = await getMedicationEntriesForDay(day.id);
  if (!todaysEntries?.length) return null;

  const type = await getActiveBirthControlType();
  if (!type) return null;

  const med = await getMedication(type);
  if (!med?.id) return null;

  const logged = todaysEntries.some((e) => e.medication_id === med.id);
  return logged ? type : null;
}

// log birth control for today
export async function quickLogBirthControlForToday(name: string) {
  const date = todayISO();

  // make sure the day exists
  let day = await getDay(date);
  if (!day) {
    await insertDay(date, 0, undefined, false, false);
    day = await getDay(date);
  }
  if (!day?.id) throw new Error("Could not ensure today's day row");

  // look up med ID
  const med = await getMedication(name);
  if (!med?.id) throw new Error(`Medication not found: ${name}`);

  // skip if already logged
  const todaysEntries = await getMedicationEntriesForDay(day.id);
  const already = todaysEntries?.some((e) => e.medication_id === med.id);
  if (already) {
    return;
  }

  // insert entry with time stamp
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  await insertMedicationEntry(day.id, med.id, time, undefined);
}
