import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "react-native-paper";

export default function NameScreen() {
  const theme = useTheme();

  function onContinue() {
    router.push({ pathname: "/(onboarding)/tour" as any });
  }

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 100,
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Centered Title */}
      <Text
        style={{
          fontSize: 26,
          fontWeight: "600",
          textAlign: "center",
          color: theme.colors.onBackground,
          marginBottom: 18,
        }}
      >
        Welcome to Ephira
      </Text>

      {/* Single overview paragraph */}
      <Text
        style={{
          fontSize: 16,
          lineHeight: 24,
          textAlign: "center",
          color: theme.colors.onBackground,
          opacity: 0.75,
        }}
      >
        Ephira is a private space to track your cycle, log symptoms, and better
        understand patterns over time. Everything stays on your device, giving
        you a simple and secure way to stay in tune with your body.
      </Text>

      {/* Spacer so layout doesn’t feel cramped */}
      <View style={{ flex: 1 }} />

      {/* Walkthrough button */}
      <Pressable
        onPress={onContinue}
        style={{
          height: 56,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.primary,
          marginBottom: 30,
        }}
      >
        <Text
          style={{
            color: theme.colors.onPrimary,
            fontWeight: "600",
            fontSize: 16,
          }}
        >
          Start Walkthrough
        </Text>
      </Pressable>
    </View>
  );
}
