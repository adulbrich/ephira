import { useEffect, useState } from "react";
import { View } from "react-native";
import { List, Text } from "react-native-paper";
import { getAllVisibleMoods } from "@/db/database";
import ChipSelection from "./ChipSelection";

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

  useEffect(() => {
    const fetchMoods = async () => {
      const moods = await getAllVisibleMoods();
      setMoodOptions(moods.map((mood) => mood.name));
    };
    fetchMoods();
  }, [state]);

  const selectedVisibleMoods = selectedMoods.filter((mood) =>
    moodOptions.includes(mood),
  );

  return (
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
    </List.Accordion>
  );
}
