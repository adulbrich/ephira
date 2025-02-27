import { useEffect, useState } from "react";
import { List } from "react-native-paper";
import ChipSelection from "./ChipSelection";
import { getAllSymptoms } from "@/db/database";

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
      const symptoms = await getAllSymptoms();
      setSymptomOptions(
        symptoms
          .filter((symptom) => symptom.visible)
          .map((symptom) => symptom.name),
      );
    };
    fetchSymptoms();
  }, [state]);

  return (
    <List.Accordion
      title={"Symptoms   |   " + selectedSymptoms.length + " Selected"}
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
        label="Select Symptoms:"
      />
    </List.Accordion>
  );
}
