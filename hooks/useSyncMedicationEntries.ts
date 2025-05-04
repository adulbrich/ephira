import { useCallback } from "react";
import {
  getDay,
  getMedicationEntriesForDay,
  getMedication,
  insertMedicationEntry,
  deleteMedicationEntry,
  insertMedication,
} from "@/db/database";
import { birthControlOptions } from "@/constants/BirthControlTypes";

export function useSyncMedicationEntries(date: string) {
  const syncMedicationEntries = useCallback(
    async (selectedValues: string[], time_taken?: string, notes?: string) => {
      const day = await getDay(date);
      if (!day) return;

      const existingEntries = await getMedicationEntriesForDay(day.id);

      const insertEntry = async (
        dayId: number,
        itemId: number,
        time_taken?: string,
        notes?: string,
      ) => insertMedicationEntry(dayId, itemId, time_taken, notes);

      const deleteEntry = (entryId: number) => deleteMedicationEntry(entryId);

      const getItem = getMedication;
      const insertItem = insertMedication;

      for (const value of selectedValues) {
        let item = await getItem(value);
        if (!item) {
          await insertItem(value, true);
          item = await getItem(value);
        }
        if (item) {
          const isBirthControl = birthControlOptions.find(
            (option: string) => option === value,
          );
          if (isBirthControl) {
            await insertEntry(day.id, item.id, time_taken, notes);
          } else {
            await insertEntry(day.id, item.id);
          }
        }
      }

      const selectedIds = await Promise.all(
        selectedValues.map(async (value) => {
          const item = await getItem(value);
          return item?.id ?? null;
        }),
      );

      const validIds = selectedIds.filter((id) => id !== null);

      for (const entry of existingEntries) {
        const entryId = (entry as { medication_id: number }).medication_id;
        if (!validIds.includes(entryId)) {
          await deleteEntry(entry.id);
        }
      }
    },
    [date],
  );

  return { syncMedicationEntries };
}
