import { List, Text, Switch } from "react-native-paper";
import { View } from "react-native";
import { loggingAccordionTitleStyles } from "@/components/dayView/loggingGridLayout";
import { Section } from "@/constants/Sections";

export default function IntercourseAccordion({
  state,
  setExpandedAccordion,
  intercourse,
  setIntercourse,
}: {
  state: Section | null;
  setExpandedAccordion: (section: Section | null) => void;
  intercourse: boolean;
  setIntercourse: (value: boolean) => void;
}) {
  return (
    <List.Accordion
      title={
        <View style={loggingAccordionTitleStyles.row}>
          <Text style={loggingAccordionTitleStyles.label}>Intercourse</Text>
          <Text style={loggingAccordionTitleStyles.value}>
            |{"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
            {intercourse ? "Yes" : "No"}
          </Text>
        </View>
      }
      expanded={state === Section.Intercourse}
      onPress={() =>
        setExpandedAccordion(
          state === Section.Intercourse ? null : Section.Intercourse,
        )
      }
      left={(props) => <List.Icon {...props} icon="heart" />}
    >
      <View
        style={{
          padding: 16,
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 16 }}>Log Intercourse</Text>
        <Switch value={intercourse} onValueChange={setIntercourse} />
      </View>
    </List.Accordion>
  );
}
