import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { getDrizzleDatabase } from "@/db/database";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { useTheme } from "react-native-paper";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Set the animation options
SplashScreen.setOptions({
  duration: 400,
  fade: true,
});

export default function TabLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    async function prepare() {
      let db;
      let attempts = 0;

      // Try to access the database until it's available
      while (!db && attempts < 10) {
        db = getDrizzleDatabase(); // Try to get the database

        if (!db) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for 500ms before trying again
        }
      }

      if (db) {
        // Database is accessible, app can proceed
        setAppIsReady(true);
      } else {
        console.warn("Failed to access database after multiple attempts.");
      }

      await SplashScreen.hideAsync(); // Hide splash screen once everything is ready
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null; // Keep splash screen visible until ready
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
            paddingBottom: 6,
            height: 60,
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gearshape" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
