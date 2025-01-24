import { useCallback } from "react";
import {
  getDay,
  getSymptomEntriesForDay,
  getMoodEntriesForDay,
  getSymptomByID,
  getMoodByID,
} from "@/db/database";

export function useFetchEntries(
  date: string,
  setSelectedSymptoms: (values: string[]) => void,
  setSelectedMoods: (values: string[]) => void,
) {
  const fetchEntries = useCallback(
    async (type: "symptom" | "mood") => {
      const getEntries =
        type === "symptom" ? getSymptomEntriesForDay : getMoodEntriesForDay;
      const getById = type === "symptom" ? getSymptomByID : getMoodByID;
      const setSelected =
        type === "symptom" ? setSelectedSymptoms : setSelectedMoods;

      const day = await getDay(date);
      if (!day) {
        setSelected([]);
        return;
      }

      const entries = await getEntries(day.id);
      const values = await Promise.all(
        entries.map(async (entry) => {
          const id =
            type === "symptom"
              ? (entry as { symptom_id: number }).symptom_id
              : (entry as { mood_id: number }).mood_id;
          const item = await getById(id);
          return item?.name ?? null;
        }),
      );
      setSelected(values.filter((value) => value !== null) as string[]);
    },
    [date, setSelectedMoods, setSelectedSymptoms],
  );

  return { fetchEntries };
}
