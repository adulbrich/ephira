import { List, Text } from "react-native-paper";
import { View } from "react-native";

export default function MedicationsAccordion({
  state,
  setExpandedAccordion,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
}) {
  return (
    <List.Accordion
      title="Medications"
      expanded={state === "medications"}
      onPress={() =>
        setExpandedAccordion(state === "medications" ? null : "medications")
      }
      left={(props) => <List.Icon {...props} icon="pill" />}
    >
      <View style={{ padding: 16 }}>
        <Text>Nothing here yet!</Text>
      </View>
    </List.Accordion>
  );
}
