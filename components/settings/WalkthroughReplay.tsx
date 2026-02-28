import { List, Button } from "react-native-paper";
import { ThemedView } from "@/components/ThemedView";
import { router } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

export default function WalkthroughReplay() {
  const [expanded, setExpanded] = useState(false);

  return (
    <ThemedView style={{ height: "100%" }}>
      <List.Section>
        <List.Accordion
          title="Walkthrough"
          titleStyle={{ fontSize: 20 }}
          expanded={expanded}
          onPress={() => setExpanded((v) => !v)}
        >
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Button
              mode="contained"
              onPress={() => router.push("/(onboarding)/tour" as any)}
            >
              See App Walkthrough
            </Button>
          </View>
        </List.Accordion>
      </List.Section>
    </ThemedView>
  );
}
