import React, { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { useOnboarding } from "../../assets/src/calendar-storage";

export default function OnboardingNameScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setUserName = useOnboarding((s) => s.setUserName);

  const [name, setName] = useState("");

  const trimmed = useMemo(() => name.trim(), [name]);
  const canContinue = trimmed.length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    setUserName(trimmed);
    router.push("./track");
  };

  const handleSkip = () => {
    setUserName("");
    router.push("./track");
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.container}>
        {/* Push content down toward center */}
        <View style={styles.topSpacer} />

        {/* Center block */}
        <View style={styles.centerBlock}>
          <Text
            variant="headlineMedium"
            style={[styles.title, { color: theme.colors.onBackground }]}
          >
            👋 Welcome to Ephira
          </Text>

          <Text
            variant="bodyMedium"
            style={[
              styles.about,
              { color: theme.colors.onBackground, opacity: 0.8 },
            ]}
          >
            Ephira helps you track your period or pregnancy, log symptoms, and
            build healthier routines over time. Your data stays on your device.
          </Text>

          <View style={styles.spacerMd} />

          <Text
            variant="headlineSmall"
            style={[styles.subtitle, { color: theme.colors.onBackground }]}
          >
            What’s your name?
          </Text>

          <View style={styles.spacerSm} />

          <TextInput
            mode="outlined"
            label="Enter your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            style={styles.input}
            textColor={theme.colors.onBackground}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />

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

        {/* Bottom area */}
        <View style={styles.bottomArea}>
          <View style={styles.progressRow}>
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
              You can edit this later.
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

  about: {
    marginTop: 10,
    lineHeight: 20,
  },

  subtitle: {
    marginTop: 6,
    opacity: 0.9,
    fontWeight: "600",
  },

  spacerSm: { height: 10 },
  spacerMd: { height: 14 },

  input: { backgroundColor: "transparent" },

  primaryButton: { borderRadius: 999, marginTop: 2 },
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


