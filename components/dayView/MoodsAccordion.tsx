import { List } from "react-native-paper";
import { moodOptions } from "@/constants/Moods";
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
  return (
    <List.Accordion
      title={"Moods   |   " + selectedMoods.length + " Selected"}
      expanded={state === "mood"}
      onPress={() => setExpandedAccordion(state === "mood" ? null : "mood")}
      left={(props) => <List.Icon {...props} icon="emoticon" />}
    >
      <ChipSelection
        options={moodOptions}
        selectedValues={selectedMoods}
        setSelectedValues={setSelectedMoods}
        label="Select Moods:"
      />
    </List.Accordion>
  );
}
