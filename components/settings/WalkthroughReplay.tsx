import { List } from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import { router } from "expo-router";

export default function WalkthroughReplay() {
  return (
    <ThemedView style={{ height: "100%" }}>
      <List.Section>
        <List.Accordion
          title="Replay Walkthrough"
          titleStyle={{ fontSize: 20 }}
          expanded={false}
          onPress={() => router.push("/(onboarding)/tour" as any)}
        >
          {/* empty on purpose */}
        </List.Accordion>
      </List.Section>
    </ThemedView>
  );
}
