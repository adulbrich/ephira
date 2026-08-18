import { useState } from "react";
import { View } from "react-native";
import { List, Text, Button } from "react-native-paper";
import ChipSelection from "./ChipSelection";
import { birthControlOptions } from "@/constants/BirthControlTypes";
import CustomEntries from "@/components/settings/CustomEntries";
import { loggingAccordionTitleStyles } from "@/components/dayView/loggingGridLayout";
import { Section } from "@/constants/Sections";

export default function MedicationsAccordion({
  state,
  setExpandedAccordion,
  medicationOptions,
  selectedMedications,
  setSelectedMedications,
}: {
  state: Section | null;
  setExpandedAccordion: (section: Section | null) => void;
  medicationOptions: string[];
  selectedMedications: string[];
  setSelectedMedications: (medications: string[]) => void;
}) {
  const [customEntriesVisible, setCustomEntriesVisible] = useState(false);

  // Filter out birth control medications and only include visible medications to calculate the count
  const medicationsWithoutBirthControl = selectedMedications.filter(
    (medication) =>
      !birthControlOptions.includes(medication) &&
      medicationOptions.includes(medication),
  );

  const showCustomEntries = () => {
    setCustomEntriesVisible(true);
  };

  return (
    <>
      <List.Accordion
        title={
          <View style={loggingAccordionTitleStyles.row}>
            <Text style={loggingAccordionTitleStyles.label}>Medications</Text>
            <Text style={loggingAccordionTitleStyles.value}>
              |{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              {medicationsWithoutBirthControl.length + " Selected"}
            </Text>
          </View>
        }
        expanded={state === Section.Medications}
        onPress={() =>
          setExpandedAccordion(
            state === Section.Medications ? null : Section.Medications,
          )
        }
        left={(props) => <List.Icon {...props} icon="pill" />}
      >
        <ChipSelection
          options={medicationOptions}
          selectedValues={selectedMedications}
          setSelectedValues={setSelectedMedications}
          label="Select Medications:"
        />

        <View
          style={{
            width: "100%",
            maxWidth: "100%",
            padding: 6,
            paddingHorizontal: 20,
            marginBottom: 14,
          }}
        >
          <Button
            mode="contained-tonal"
            icon="plus"
            onPress={showCustomEntries}
          >
            Add Your Medication
          </Button>
        </View>
      </List.Accordion>

      {/* navigate to custom entries */}
      {customEntriesVisible && (
        <CustomEntries
          modalVisibleInitially={true}
          initialExpandedCatalogue="medication"
          onModalClose={() => setCustomEntriesVisible(false)}
        />
      )}
    </>
  );
}
