import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

export default function TrackPreview() {
  const theme = useTheme();
  const cardBase = { backgroundColor: theme.colors.surface };

  return (
    <View style={styles.stack}>
      <Card style={[styles.card, cardBase]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
         Period Tracking
          </Text>
          <Text variant="bodySmall" style={[styles.cardBody, { color: theme.colors.onSurface }]}>
            Track cycles, symptoms, moods, and patterns over time.
          </Text>
        </Card.Content>
      </Card>

      <Card style={[styles.card, cardBase]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Pregnancy Tracking
          </Text>
          <Text variant="bodySmall" style={[styles.cardBody, { color: theme.colors.onSurface }]}>
            Track week-by-week progress, symptoms, and important notes.
          </Text>
        </Card.Content>
      </Card>

      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onBackground, opacity: 0.65, textAlign: "center" }}
      >
        Choose your focus — you can change it later.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    gap: 10,
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardTitle: {
    fontWeight: "700",
  },
  cardBody: {
    marginTop: 6,
    opacity: 0.85,
  },
});
