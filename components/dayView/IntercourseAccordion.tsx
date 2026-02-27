import { List, Text, Switch } from "react-native-paper";
import { View } from "react-native";

export default function IntercourseAccordion({
  state,
  setExpandedAccordion,
  intercourse,
  setIntercourse,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
  intercourse: boolean;
  setIntercourse: (value: boolean) => void;
}) {
  return (
    <List.Accordion
      title={
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ width: 120, fontSize: 16 }}>Intercourse</Text>
          <Text style={{ fontSize: 16 }}>
            |{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
            {intercourse ? "Yes" : "No"}
          </Text>
        </View>
      }
      expanded={state === "intercourse"}
      onPress={() =>
        setExpandedAccordion(state === "intercourse" ? null : "intercourse")
      }
      left={(props) => <List.Icon {...props} icon="heart" />}
    >
      <View
        style={{
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 16 }}>Log Intercourse</Text>
        <Switch value={intercourse} onValueChange={setIntercourse} />
      </View>
    </List.Accordion>
  );
}
