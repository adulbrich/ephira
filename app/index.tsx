import { useEffect } from "react";
import { router } from "expo-router";
import { getHasSeenWalkthrough } from "@/assets/src/onboarding/onboarding-storage";
import { getSetting } from "@/db/database";
import { SettingsKeys, TRACKING_MODES } from "@/constants/Settings";

export default function Index() {
  useEffect(() => {
    (async () => {
      const seen = await getHasSeenWalkthrough();
      if (!seen) {
        router.replace("/(onboarding)/welcome" as any);
        return;
      }
      const modeSetting = await getSetting(SettingsKeys.trackingMode);
      const mode = modeSetting?.value ?? TRACKING_MODES.CYCLE;
      if (mode === TRACKING_MODES.PREGNANCY) {
        router.replace("/(pregnancy-tabs)" as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    })();
  }, []);

  return null;
}
