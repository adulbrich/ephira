import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Alert, useColorScheme, View } from "react-native";
import {
  Button,
  MD3DarkTheme as DarkTheme,
  MD3LightTheme as DefaultTheme,
  PaperProvider,
  Text,
} from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { UnavailableStatus } from "@/db/databaseFile";

const COPY: Record<UnavailableStatus, { title: string; body: string }> = {
  unreadable: {
    title: "Your data can't be opened on this phone",
    body: "ephira encrypts your data with a key that never leaves the phone that created it. This phone doesn't have that key, which happens after restoring a backup or moving to a new phone. Start fresh deletes the data that can't be opened, so you can use ephira again.",
  },
  temporarilyUnavailable: {
    title: "ephira couldn't open your data",
    body: "Nothing has been changed or deleted. Close ephira completely and open it again.",
  },
};

/**
 * Shown instead of the app when the database did not open. See ADR 0005 for
 * when each status occurs.
 */
export default function DatabaseUnavailable({
  status,
  onStartFresh,
}: {
  status: UnavailableStatus;
  onStartFresh: () => void;
}) {
  const theme = useColorScheme() === "dark" ? DarkTheme : DefaultTheme;
  const [outcome, setOutcome] = useState<string | null>(null);

  // The root layout holds the splash until authentication finishes, and
  // authentication never runs while the database is unavailable.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const startFresh = () => {
    try {
      onStartFresh();
      setOutcome(
        "The data that couldn't be opened has been deleted. Close ephira completely and open it again to start fresh.",
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setOutcome(
        `The data was not deleted (${reason}). Close ephira and open it again to try again.`,
      );
    }
  };

  const confirmStartFresh = () =>
    Alert.alert(
      "Delete the data that can't be opened?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: startFresh },
      ],
    );

  const { title, body } = COPY[status];

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
        >
          <View
            style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}
          >
            <Text variant="headlineSmall">{title}</Text>
            <Text variant="bodyLarge">{outcome ?? body}</Text>
            {status === "unreadable" && outcome === null && (
              <Button
                mode="contained"
                buttonColor={theme.colors.error}
                onPress={confirmStartFresh}
              >
                Start fresh
              </Button>
            )}
          </View>
          <StatusBar style="auto" />
        </SafeAreaView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
