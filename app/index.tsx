import { useEffect } from "react";
import { router } from "expo-router";
import { getHasSeenWalkthrough } from "@/assets/src/onboarding/onboarding-storage";

export default function Index() {
  useEffect(() => {
    (async () => {
      const seen = await getHasSeenWalkthrough();
      router.replace((seen ? "/(tabs)" : "/(onboarding)/welcome") as any);
    })();
  }, []);

  return null;
}
