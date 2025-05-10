import { List, TextInput, Text  } from "react-native-paper";
import { View } from "react-native";

export default function NotesAccordion({
  state,
  setExpandedAccordion,
  notes,
  setNotes,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
  notes: string | undefined;
  setNotes: (notes: string) => void;
}) {
  return (
    <List.Accordion
      title={
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ width: 120, fontSize: 16 }}>Notes</Text>
        </View>
      }
      expanded={state === "notes"}
      onPress={() => setExpandedAccordion(state === "notes" ? null : "notes")}
      left={(props) => <List.Icon {...props} icon="note" />}
    >
      <View style={{ padding: 16 }}>
        <TextInput
          label="Notes"
          value={notes}
          onChangeText={(notes) => setNotes(notes)}
          placeholder="Add Notes..."
        />
      </View>
    </List.Accordion>
  );
}
