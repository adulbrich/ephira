import { List, TextInput, Text } from "react-native-paper";
import { View } from "react-native";
import { loggingAccordionTitleStyles } from "@/components/dayView/loggingGridLayout";
import { Section } from "@/constants/Sections";

export default function NotesAccordion({
  state,
  setExpandedAccordion,
  notes,
  setNotes,
}: {
  state: Section | null;
  setExpandedAccordion: (section: Section | null) => void;
  notes: string | undefined;
  setNotes: (notes: string) => void;
}) {
  return (
    <List.Accordion
      title={
        <View style={loggingAccordionTitleStyles.row}>
          <Text style={loggingAccordionTitleStyles.label}>Notes</Text>
        </View>
      }
      expanded={state === Section.Notes}
      onPress={() =>
        setExpandedAccordion(state === Section.Notes ? null : Section.Notes)
      }
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
