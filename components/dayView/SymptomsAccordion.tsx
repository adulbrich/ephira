import { useState } from "react";
import { View } from "react-native";
import { List, Text, Button } from "react-native-paper";
import ChipSelection from "./ChipSelection";
import CustomEntries from "@/components/settings/CustomEntries";
import { loggingAccordionTitleStyles } from "@/components/dayView/loggingGridLayout";
import { Section } from "@/constants/Sections";

export default function SymptomsAccordion({
  state,
  setExpandedAccordion,
  symptomOptions,
  selectedSymptoms,
  setSelectedSymptoms,
}: {
  state: Section | null;
  setExpandedAccordion: (section: Section | null) => void;
  symptomOptions: string[];
  selectedSymptoms: string[];
  setSelectedSymptoms: (symptoms: string[]) => void;
}) {
  const [customEntriesVisible, setCustomEntriesVisible] = useState(false);

  const selectedVisibleSymptoms = selectedSymptoms.filter((symptom) =>
    symptomOptions.includes(symptom),
  );

  const showCustomEntries = () => {
    setCustomEntriesVisible(true);
  };

  return (
    <>
      <List.Accordion
        title={
          <View style={loggingAccordionTitleStyles.row}>
            <Text style={loggingAccordionTitleStyles.label}>Symptoms</Text>
            <Text style={loggingAccordionTitleStyles.value}>
              |{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              {selectedVisibleSymptoms.length + " Selected"}
            </Text>
          </View>
        }
        expanded={state === Section.Symptoms}
        onPress={() =>
          setExpandedAccordion(
            state === Section.Symptoms ? null : Section.Symptoms,
          )
        }
        left={(props) => <List.Icon {...props} icon="alert-decagram" />}
      >
        <ChipSelection
          options={symptomOptions}
          selectedValues={selectedSymptoms}
          setSelectedValues={setSelectedSymptoms}
          label="Select Symptoms"
        />

        <View
          style={{
            width: "100%",
            padding: 6,
            paddingLeft: 20,
            paddingRight: 20,
            marginBottom: 14,
          }}
        >
          <Button
            mode="contained-tonal"
            icon="plus"
            onPress={showCustomEntries}
          >
            Add Your Symptom
          </Button>
        </View>
      </List.Accordion>

      {/* navigate to custom entries */}
      {customEntriesVisible && (
        <CustomEntries
          modalVisibleInitially={true}
          initialExpandedCatalogue="symptom"
          onModalClose={() => setCustomEntriesVisible(false)}
        />
      )}
    </>
  );
}
