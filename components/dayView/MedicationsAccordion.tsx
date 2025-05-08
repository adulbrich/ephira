import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { List } from "react-native-paper";
import { getAllVisibleMedications } from "@/db/database";
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
  const [medicationOptions, setMedicationOptions] = useState<string[]>([]);
  useEffect(() => {
    const fetchMedications = async () => {
      const medications = await getAllVisibleMedications();
      setMedicationOptions(
        medications
          .filter((medication) => medication.type !== "birth control")
          .map((medication) => medication.name),
      );
    };
    fetchMedications();
  }, [state]);

  // Filter out birth control medications and only include visible medications to calculate the count
  const medicationsWithoutBirthControl = selectedMedications.filter(
    (medication) =>
      !birthControlOptions.includes(medication) &&
      medicationOptions.includes(medication),
  );

  return (
    <List.Accordion
      title={
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ width: 120, fontSize: 16 }}>Medications</Text>
          <Text style={{ fontSize: 16 }}>
            |{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
            {medicationsWithoutBirthControl.length + " Selected"}
          </Text>
        </View>
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
