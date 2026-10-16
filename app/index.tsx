import { useEffect } from "react";
import { router } from "expo-router";
import { getHasSeenWalkthrough } from "@/assets/src/onboarding/onboarding-storage";
import { getSetting } from "@/db/database";
import { SettingsKeys, TRACKING_MODES } from "@/constants/Settings";
import { takeLaunchNotificationRoute } from "@/services/notificationRouting";

export default function Index() {
  useEffect(() => {
    // Taken before the awaits so the tap listener in the root layout, if it
    // hears this same tap meanwhile, finds it already routed. Landing here
    // rather than pushing from the layout matters: a push would be undone by
    // the replace below.
    const notificationRoute = takeLaunchNotificationRoute();

    (async () => {
      const seen = await getHasSeenWalkthrough();
      if (!seen) {
        router.replace("/(onboarding)/welcome");
        return;
      }
      if (notificationRoute) {
        router.replace(notificationRoute);
        return;
      }
      const modeSetting = await getSetting(SettingsKeys.trackingMode);
      const mode = modeSetting?.value ?? TRACKING_MODES.CYCLE;
      if (mode === TRACKING_MODES.PREGNANCY) {
        router.replace("/(pregnancy-tabs)");
      } else {
        router.replace("/(tabs)");
      }
    })();
  }, []);

  return null;
}
