import { DeviceEventEmitter } from "react-native";
import { getAllDataAsJson } from "@/db/database";
import { getDay, insertDay } from "@/db/operations/days";
import { getMedicationEntriesForDay, insertMedicationEntry } from "@/db/operations/medicationEntries";
import { getMedication } from "@/db/operations/medications";

type BirthControlEntry = { name: string; time_taken?: string | null; notes?: string | null };

const todayISO = () => new Date().toISOString().slice(0, 10);

// find the most recently used birth-control name
export async function getLastUsedBirthControlName(): Promise<string | null> {
  const exportData = await getAllDataAsJson();
  if (!exportData) return null;

  const dates = Object.keys(exportData.dailyData).sort().reverse(); // get newest
  for (const d of dates) {
    const list: BirthControlEntry[] = exportData.dailyData[d]?.birth_control ?? [];
    if (list.length && list[0]?.name) return list[0].name;
  }
  return null;
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
    DeviceEventEmitter.emit("entries:changed");
    return;
  }

  // insert entry with time stamp
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  await insertMedicationEntry(day.id, med.id, time, undefined);

  // refresh UI
  DeviceEventEmitter.emit("entries:changed");
}
