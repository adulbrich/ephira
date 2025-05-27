import { useEffect, useState } from "react";
import { View } from "react-native";
import { List, Text, Button } from "react-native-paper";
import ChipSelection from "./ChipSelection";
import { getAllVisibleSymptoms } from "@/db/database";
import CustomEntries from "@/components/settings/CustomEntries";

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
  const [customEntriesVisible, setCustomEntriesVisible] = useState(false);

  useEffect(() => {
    const fetchSymptoms = async () => {
      const symptoms = await getAllVisibleSymptoms();
      setSymptomOptions(symptoms.map((symptom) => symptom.name));
    };
    fetchSymptoms();
  }, [state, customEntriesVisible]);

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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ width: 120, fontSize: 16 }}>Symptoms</Text>
            <Text style={{ fontSize: 16 }}>
              |{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              {selectedVisibleSymptoms.length + " Selected"}
            </Text>
          </View>
        }
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
          initialExpandedAccordion="1"
          onModalClose={() => setCustomEntriesVisible(false)}
        />
      )}
    </>
  );
}
