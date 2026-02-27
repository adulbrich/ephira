import { useEffect } from "react";
import { router } from "expo-router";
import { useTour } from "../../assets/src/tour/TourContext";
// import { setHasSeenWalkthrough } from "../../assets/src/onboarding/onboarding-storage";
import type { TourStep } from "../../assets/src/tour/types";

export default function TourStart() {
  const { start } = useTour();

  useEffect(() => {
    (async () => {
      // temp comment this out, can uncomment once we want to force the tour to show again for testing
      // await setHasSeenWalkthrough(true);

      const steps: TourStep[] = [
        {
          id: "tab.calendar",
          title: "Calendar",
          text: "See your cycle events on the calendar and tap dates to log symptoms.",
          route: "/(tabs)/calendar",
        },
        {
          id: "tab.cycle",
          title: "Cycle",
          text: "Get cycle insights and predictions based on your inputs over time.",
          route: "/(tabs)/cycle",
        },
        {
          id: "tab.settings",
          title: "Settings",
          text: "Update preferences like notifications and tracking options anytime.",
          route: "/(tabs)/settings",
        },
        {
          id: "tab.home",
          title: "Home",
          text: "Your main dashboard for recent trends and quick actions.",
          route: "/(tabs)",
        },
      ];

      // Go to the first route, then start the tour overlay.
      router.replace(steps[0].route as any);
      start(steps);
    })();
  }, [start]);

  return null;
}
