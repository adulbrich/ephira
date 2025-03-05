import { useCallback } from "react";
import {
  getDay,
  getMedicationEntriesForDay,
  getMedicationByID,
} from "@/db/database";
import { birthControlOptions } from "@/constants/BirthControlTypes";

export function useFetchMedicationEntries(
  date: string,
  setSelectedBirthControl: (value: string | null) => void,
  setSelectedMedications: (values: string[]) => void,
  setBirthControlNotes: (notes: string) => void,
  setTimeTaken: (time: string) => void,
) {
  const fetchMedicationEntries = useCallback(async () => {
    const day = await getDay(date);
    if (!day) {
      setSelectedBirthControl(null);
      setSelectedMedications([]);
      setBirthControlNotes("");
      setTimeTaken("");
      return;
    }

    const entries = await getMedicationEntriesForDay(day.id);
    const values = await Promise.all(
      entries.map(async (entry) => {
        const item = await getMedicationByID(entry.medication_id);
        return {
          name: item?.name ?? null,
          notes: entry.notes ?? null,
          time_taken: entry.time_taken ?? null,
        };
      }),
    );

    const filteredValues = values.filter((value) => value.name !== null) as {
      name: string;
      notes: string | null;
      time_taken: string | null;
    }[];

    const birthControlEntry = filteredValues.find((value) =>
      birthControlOptions.some((option) => option === value.name),
    );

    if (birthControlEntry) {
      setSelectedBirthControl(birthControlEntry.name);
      setBirthControlNotes(birthControlEntry.notes ?? "");
      setTimeTaken(birthControlEntry.time_taken ?? "");
    } else {
      setSelectedBirthControl(null);
      setBirthControlNotes("");
      setTimeTaken("");
    }

    const medicationsWithoutBirthControl = filteredValues
      .filter(
        (value) => !birthControlOptions.some((option) => option === value.name),
      )
      .map((value) => value.name);

    setSelectedMedications(medicationsWithoutBirthControl);
  }, [
    date,
    setSelectedBirthControl,
    setSelectedMedications,
    setBirthControlNotes,
    setTimeTaken,
  ]);

  return { fetchMedicationEntries };
}
