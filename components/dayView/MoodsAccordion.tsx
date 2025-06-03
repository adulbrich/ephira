import { useEffect, useState } from "react";
import { View } from "react-native";
import { List, Text, Button } from "react-native-paper";
import { getAllVisibleMoods } from "@/db/database";
import ChipSelection from "./ChipSelection";
import CustomEntries from "@/components/settings/CustomEntries";

export default function MoodsAccordion({
  state,
  setExpandedAccordion,
  selectedMoods,
  setSelectedMoods,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
  selectedMoods: string[];
  setSelectedMoods: (moods: string[]) => void;
}) {
  const [moodOptions, setMoodOptions] = useState<string[]>([]);
  const [customEntriesVisible, setCustomEntriesVisible] = useState(false);

  useEffect(() => {
    const fetchMoods = async () => {
      const moods = await getAllVisibleMoods();
      setMoodOptions(moods.map((mood) => mood.name));
    };
    fetchMoods();
  }, [state, customEntriesVisible]);

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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ width: 120, fontSize: 16 }}>Moods</Text>
            <Text style={{ fontSize: 16 }}>
              |{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              {selectedVisibleMoods.length + " Selected"}
            </Text>
          </View>
        }
        expanded={state === "mood"}
        onPress={() => setExpandedAccordion(state === "mood" ? null : "mood")}
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
          // automatically opens to the "Moods" section (id=2)
          initialExpandedAccordion="2"
          onModalClose={() => setCustomEntriesVisible(false)}
        />
      )}
    </>
  );
}
