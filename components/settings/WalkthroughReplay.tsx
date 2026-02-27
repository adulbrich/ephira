import { List, Divider, Text, useTheme } from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import { router } from "expo-router";

export default function WalkthroughReplay() {
  const theme = useTheme();

  return (
    <ThemedView style={{ height: "100%" }}>
      <List.Section>
        <List.Accordion
          title="View App Walkthrough"
          titleStyle={{ fontSize: 30 }}
          expanded={false}
          onPress={() => router.push("/(onboarding)/tour" as any)}
          children={null}
        />
      </List.Section>
    </ThemedView>
  );
}