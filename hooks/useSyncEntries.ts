import { useCallback } from "react";
import {
  getDay,
  getSymptomEntriesForDay,
  getMoodEntriesForDay,
  getSymptom,
  getMood,
  insertSymptom,
  insertMood,
  insertSymptomEntry,
  insertMoodEntry,
  deleteSymptomEntry,
  deleteMoodEntry,
} from "@/db/database";

export function useSyncEntries(date: string) {
  const syncEntries = useCallback(
    async (selectedValues: string[], type: "symptom" | "mood") => {
      const day = await getDay(date);
      if (!day) return;

      const existingEntries =
        type === "symptom"
          ? await getSymptomEntriesForDay(day.id)
          : await getMoodEntriesForDay(day.id);

      const insertEntry =
        type === "symptom" ? insertSymptomEntry : insertMoodEntry;
      const deleteEntry =
        type === "symptom" ? deleteSymptomEntry : deleteMoodEntry;
      const getItem = type === "symptom" ? getSymptom : getMood;
      const insertItem = type === "symptom" ? insertSymptom : insertMood;

      for (const value of selectedValues) {
        let item = await getItem(value);
        if (!item) {
          await insertItem(value, true);
          item = await getItem(value);
        }
        if (item) {
          await insertEntry(day.id, item.id);
        }
      }

      const selectedIds = await Promise.all(
        selectedValues.map(async (value) => {
          const item =
            type === "symptom" ? await getSymptom(value) : await getMood(value);
          return item?.id ?? null;
        }),
      );

      const validIds = selectedIds.filter((id) => id !== null);
      for (const entry of existingEntries) {
        const entryId =
          type === "symptom"
            ? (entry as { symptom_id: number }).symptom_id
            : (entry as { mood_id: number }).mood_id;
        if (
          (type === "symptom" && !validIds.includes(entryId)) ||
          (type === "mood" && !validIds.includes(entryId))
        ) {
          await deleteEntry(entry.id);
        }
      }
    },
    [date],
  );
  return { syncEntries };
}
