import { useEffect, useState } from "react";
import { List } from "react-native-paper";
import ChipSelection from "./ChipSelection";
import { getAllVisibleSymptoms } from "@/db/database";

export default function SymptomsAccordion({
  state,
  setExpandedAccordion,
  selectedSymptoms,
  setSelectedSymptoms,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
  selectedSymptoms: string[];
  setSelectedSymptoms: (symptoms: string[]) => void;
}) {
  const [symptomOptions, setSymptomOptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchSymptoms = async () => {
      const symptoms = await getAllVisibleSymptoms();
      setSymptomOptions(symptoms.map((symptom) => symptom.name));
    };
    fetchSymptoms();
  }, [state]);

  const selectedVisibleSymptoms = selectedSymptoms.filter((symptom) =>
    symptomOptions.includes(symptom),
  );

  return (
    <List.Accordion
      title={"Symptoms   |   " + selectedVisibleSymptoms.length + " Selected"}
      expanded={state === "symptoms"}
      onPress={() =>
        setExpandedAccordion(state === "symptoms" ? null : "symptoms")
      }
      left={(props) => <List.Icon {...props} icon="alert-decagram" />}
    >
      <ChipSelection
        options={symptomOptions}
        selectedValues={selectedSymptoms}
        setSelectedValues={setSelectedSymptoms}
        label="Select Symptoms"
      />
    </List.Accordion>
  );
}
