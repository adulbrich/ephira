import { useState } from "react";
import { View } from "react-native";
import { List, Text, Button } from "react-native-paper";
import ChipSelection from "./ChipSelection";
import CustomEntries from "@/components/settings/CustomEntries";
import { loggingAccordionTitleStyles } from "@/components/dayView/loggingGridLayout";
import { Section } from "@/constants/Sections";

export default function MoodsAccordion({
  state,
  setExpandedAccordion,
  moodOptions,
  selectedMoods,
  setSelectedMoods,
}: {
  state: Section | null;
  setExpandedAccordion: (section: Section | null) => void;
  moodOptions: string[];
  selectedMoods: string[];
  setSelectedMoods: (moods: string[]) => void;
}) {
  const [customEntriesVisible, setCustomEntriesVisible] = useState(false);

  const selectedVisibleMoods = selectedMoods.filter((mood) =>
    moodOptions.includes(mood),
  );

  const showCustomEntries = () => {
    setCustomEntriesVisible(true);
  };

  return (
    <>
      <List.Accordion
        title={
          <View style={loggingAccordionTitleStyles.row}>
            <Text style={loggingAccordionTitleStyles.label}>Moods</Text>
            <Text style={loggingAccordionTitleStyles.value}>
              |{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              {selectedVisibleMoods.length + " Selected"}
            </Text>
          </View>
        }
        expanded={state === Section.Moods}
        onPress={() =>
          setExpandedAccordion(state === Section.Moods ? null : Section.Moods)
        }
        left={(props) => <List.Icon {...props} icon="emoticon" />}
      >
        <ChipSelection
          options={moodOptions}
          selectedValues={selectedMoods}
          setSelectedValues={setSelectedMoods}
          label="Select Moods"
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
            Add Your Mood
          </Button>
        </View>
      </List.Accordion>

      {/* navigate to custom entries */}
      {customEntriesVisible && (
        <CustomEntries
          modalVisibleInitially={true}
          initialExpandedCatalogue="mood"
          onModalClose={() => setCustomEntriesVisible(false)}
        />
      )}
    </>
  );
}
