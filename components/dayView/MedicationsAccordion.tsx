import { List, Text } from "react-native-paper";
import { medicationOptions } from "@/constants/Medications";
import ChipSelection from "./ChipSelection";

export default function MedicationsAccordion({
  state,
  setExpandedAccordion,
  selectedMedications,
  setSelectedMedications,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
  selectedMedications: string[];
  setSelectedMedications: (medications: string[]) => void;
}) {
  return (
    <List.Accordion
      title="Medications"
      expanded={state === "medications"}
      onPress={() =>
        setExpandedAccordion(state === "medications" ? null : "medications")
      }
      left={(props) => <List.Icon {...props} icon="pill" />}
    >
      <ChipSelection
          options={medicationOptions}
          selectedValues={selectedMedications}
          setSelectedValues={setSelectedMedications}
          label="Select Medications:"
        />
    </List.Accordion>
  );
}
