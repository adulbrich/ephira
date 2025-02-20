import { List } from "react-native-paper";
import { medicationOptions } from "@/constants/Medications";
import ChipSelection from "./ChipSelection";
import { birthControlOptions } from "@/constants/BirthControlTypes";

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
  // Filter out birth control medications to calculate the count
  const medicationsWithoutBirthControl = selectedMedications.filter(
    (medication) => !birthControlOptions.includes(medication),
  );

  return (
    <List.Accordion
      title={
        "Medications   |   " +
        medicationsWithoutBirthControl.length +
        " Selected"
      }
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
