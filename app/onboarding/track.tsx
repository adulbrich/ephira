import React, { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useOnboarding } from "../../assets/src/calendar-storage";

type TrackingMode = "period" | "pregnancy";

export default function OnboardingTrackScreen() {
  const router = useRouter();
  const theme = useTheme();

  const userName = useOnboarding((s) => s.userName);
  const setTrackingMode = useOnboarding((s) => s.setTrackingMode);

  const [selected, setSelected] = useState<TrackingMode | null>(null);

  const displayName = useMemo(() => {
    const n = (userName ?? "").trim();
    return n.length ? n : "there";
  }, [userName]);

  const canContinue = selected !== null;

  const handleContinue = () => {
    if (!selected) return;
    setTrackingMode(selected);
    router.push("./overview");
  };

  const handleSkip = () => {
    setTrackingMode("period");
    router.push("./overview");
  };

  const cardBase = { backgroundColor: theme.colors.surface };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.container}>
        <View style={styles.topSpacer} />

        <View style={styles.centerBlock}>
          <Text
            variant="headlineSmall"
            style={[styles.title, { color: theme.colors.onBackground }]}
          >
            Welcome, {displayName}!
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: theme.colors.onBackground }]}
          >
            What would you like Ephira to focus on?
          </Text>

          <View style={styles.spacerLg} />

          <Pressable onPress={() => setSelected("period")}>
            <Card
              style={[
                styles.card,
                cardBase,
                selected === "period" && {
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Card.Content>
                <Text
                  variant="titleMedium"
                  style={[styles.cardTitle, { color: theme.colors.onSurface }]}
                >
                  🩸 Period Tracking
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[styles.cardBody, { color: theme.colors.onSurface }]}
                >
                  Track cycles, symptoms, moods, and patterns over time.
                </Text>
              </Card.Content>
            </Card>
          </Pressable>

          <Pressable onPress={() => setSelected("pregnancy")}>
            <Card
              style={[
                styles.card,
                cardBase,
                selected === "pregnancy" && {
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Card.Content>
                <Text
                  variant="titleMedium"
                  style={[styles.cardTitle, { color: theme.colors.onSurface }]}
                >
                  🤰 Pregnancy Tracking
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[styles.cardBody, { color: theme.colors.onSurface }]}
                >
                  Track week-by-week progress, symptoms, and important notes.
                </Text>
              </Card.Content>
            </Card>
          </Pressable>

          <Text
            variant="bodySmall"
            style={[styles.note, { color: theme.colors.onBackground }]}
          >
            You can change this anytime in Settings.
          </Text>

          <View style={styles.spacerMd} />

          <Button
            mode="contained"
            onPress={handleContinue}
            disabled={!canContinue}
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
          >
            Continue
          </Button>
        </View>

        <View style={styles.bottomArea}>
          <View style={styles.progressRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: theme.colors.onBackground },
              ]}
            />
            <View
              style={[
                styles.dot,
                { backgroundColor: theme.colors.onBackground },
                styles.dotActive,
              ]}
            />
            <View
              style={[
                styles.dot,
                { backgroundColor: theme.colors.onBackground },
              ]}
            />
          </View>

          <View style={styles.bottomRow}>
            <Button
              mode="text"
              onPress={handleSkip}
              textColor={theme.colors.primary}
            >
              Skip
            </Button>

            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onBackground, opacity: 0.65 }}
            >
              Default is Period.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },

  topSpacer: { flex: 1 },

  centerBlock: {
    flexShrink: 0,
  },

  bottomArea: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 18,
  },

  title: { fontWeight: "700" },
  subtitle: { marginTop: 6, opacity: 0.85 },

  spacerLg: { height: 20 },
  spacerMd: { height: 14 },

  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardTitle: { fontWeight: "700" },
  cardBody: { marginTop: 6, opacity: 0.85 },

  note: { marginTop: 6, opacity: 0.7 },

  primaryButton: { borderRadius: 999, marginTop: 10 },
  primaryButtonContent: { height: 48 },

  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    opacity: 0.25,
  },
  dotActive: { opacity: 0.9 },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
