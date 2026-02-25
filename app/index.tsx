import { useEffect } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  useEffect(() => {
    (async () => {
      // 🔥 TEMP: wipe onboarding flag
      await AsyncStorage.removeItem("ephira.hasSeenWalkthrough");

      router.replace("/(onboarding)/name" as any);
    })();
  }, []);

  return null;
}
