import { List } from "react-native-paper";
import ChipSelection from "./ChipSelection";
import { symptomOptions } from "@/constants/Symptoms";

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
