import { View } from "react-native";
import { List, Text, IconButton, useTheme } from "react-native-paper";

export default function KicksAccordion({
  state,
  setExpandedAccordion,
  kicks,
  setKicks,
}: {
  state: string | null;
  setExpandedAccordion: (accordion: string | null) => void;
  kicks: number;
  setKicks: (kicks: number) => void;
}) {
  const theme = useTheme();

  return (
    <List.Accordion
      title={
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ width: 120, fontSize: 16 }}>Kicks</Text>
          <Text style={{ fontSize: 16 }}>
            |{"      "}
            {kicks > 0 ? `${kicks} logged` : "None"}
          </Text>
        </View>
      }
      expanded={state === "kicks"}
      onPress={() => setExpandedAccordion(state === "kicks" ? null : "kicks")}
      left={(props) => <List.Icon {...props} icon="baby-face-outline" />}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 16,
          gap: 16,
        }}
      >
        <IconButton
          icon="minus"
          mode="contained-tonal"
          size={28}
          onPress={() => setKicks(Math.max(0, kicks - 1))}
          disabled={kicks === 0}
        />
        <Text
          style={{
            fontSize: 48,
            fontWeight: "bold",
            minWidth: 64,
            textAlign: "center",
            color: theme.colors.onBackground,
          }}
        >
          {kicks}
        </Text>
        <IconButton
          icon="plus"
          mode="contained-tonal"
          size={28}
          onPress={() => setKicks(kicks + 1)}
        />
      </View>
      <Text
        style={{
          textAlign: "center",
          fontSize: 12,
          color: theme.colors.onSurfaceVariant,
          paddingBottom: 12,
        }}
      >
        Total kicks logged for this day
      </Text>
    </List.Accordion>
  );
}
