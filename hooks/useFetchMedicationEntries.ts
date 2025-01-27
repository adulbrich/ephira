import { useCallback } from "react";
import {
  getDay,
  getMedicationEntriesForDay,
  getMedicationByID,
} from "@/db/database";
import { birthControlOptions } from "@/constants/BirthControlTypes"; // Update as needed

export function useFetchMedicationEntries(
  date: string,
  setSelectedBirthControl: (value: string | null) => void,
  setSelectedMedications: (values: string[]) => void,
  setBirthControlNotes: (notes: string) => void,
) {
  const fetchMedicationEntries = useCallback(async () => {
    const day = await getDay(date);
    if (!day) {
      setSelectedBirthControl(null);
      setSelectedMedications([]);
      setBirthControlNotes("");
      return;
    }

    const entries = await getMedicationEntriesForDay(day.id);
    const values = await Promise.all(
      entries.map(async (entry) => {
        const item = await getMedicationByID(entry.medication_id);
        return {
          name: item?.name ?? null,
          notes: entry.notes ?? null,
        };
      }),
    );

    const filteredValues = values.filter((value) => value.name !== null) as {
      name: string;
      notes: string | null;
    }[];

    const birthControlEntry = filteredValues.find((value) =>
      birthControlOptions.some((option) => option.value === value.name)
    );

    if (birthControlEntry) {
      setSelectedBirthControl(birthControlEntry.name);
      setBirthControlNotes(birthControlEntry.notes ?? "");
      console.log("Birth Control Notes: ", birthControlEntry.notes);
    } else {
      setSelectedBirthControl(null);
      setBirthControlNotes("");
    }

    const medicationsWithoutBirthControl = filteredValues
      .filter((value) => !birthControlOptions.some((option) => option.value === value.name))
      .map((value) => value.name);

    setSelectedMedications(medicationsWithoutBirthControl);
    console.log("Medications Without Birth Control: ", medicationsWithoutBirthControl);
  }, [date, setSelectedBirthControl, setSelectedMedications, setBirthControlNotes]);

  return { fetchMedicationEntries };
}

