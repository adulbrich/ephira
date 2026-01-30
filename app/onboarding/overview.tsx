import React, { useMemo } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useOnboarding } from "../../assets/src/calendar-storage";

export default function OnboardingOverviewScreen() {
  const router = useRouter();
  const theme = useTheme();

  const userName = useOnboarding((s) => s.userName);
  const setHasOnboarded = useOnboarding((s) => s.setHasOnboarded);

  const displayName = useMemo(() => {
    const n = (userName ?? "").trim();
    return n.length ? n : "there";
  }, [userName]);

  const handleStart = () => {
    setHasOnboarded(true);
    router.replace("/(tabs)");
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
            You’re all set, {displayName} ✨
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: theme.colors.onBackground }]}
          >
            Here’s what you can do in Ephira.
          </Text>

          <View style={styles.spacerLg} />

          <Card style={[styles.card, cardBase]}>
            <Card.Content>
              <Text
                variant="titleMedium"
                style={[styles.cardTitle, { color: theme.colors.onSurface }]}
              >
                🗓️ Log and Track
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.cardBody, { color: theme.colors.onSurface }]}
              >
                Record flow, symptoms, moods, notes, and routines.
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.card, cardBase]}>
            <Card.Content>
              <Text
                variant="titleMedium"
                style={[styles.cardTitle, { color: theme.colors.onSurface }]}
              >
                📅 Calendar View
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.cardBody, { color: theme.colors.onSurface }]}
              >
                See patterns and history at a glance.
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.card, cardBase]}>
            <Card.Content>
              <Text
                variant="titleMedium"
                style={[styles.cardTitle, { color: theme.colors.onSurface }]}
              >
                🔒 Private by Default
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.cardBody, { color: theme.colors.onSurface }]}
              >
                Your entries stay on your device unless you choose to export.
              </Text>
            </Card.Content>
          </Card>

          <View style={styles.spacerMd} />

          <Button
            mode="contained"
            onPress={handleStart}
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
          >
            Start Using Ephira
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
              ]}
            />
            <View
              style={[
                styles.dot,
                { backgroundColor: theme.colors.onBackground },
                styles.dotActive,
              ]}
            />
          </View>

          <View style={styles.bottomRow}>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onBackground, opacity: 0.65 }}
            >
              You can change settings anytime.
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

  spacerLg: { height: 18 },
  spacerMd: { height: 14 },

  card: { borderRadius: 16, marginBottom: 12, overflow: "hidden" },
  cardTitle: { fontWeight: "700" },
  cardBody: { marginTop: 6, opacity: 0.85 },

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
    alignItems: "center",
    justifyContent: "center",
  },
});

