import { useEffect } from "react";
import { loadFlowDays } from "@/db/flowDays";
import { useData, useDatabaseChangeNotifier } from "@/stores/calendar-storage";
import type { DayData } from "@/constants/Interfaces";

/**
 * Subscription only. The rules are in `db/flowDays.ts`.
 *
 * Reloads on the database-change signal the screens that read these Days
 * already watch, so the cycle tab and the home screen no longer depend on each
 * other's render order. The only thing that used to trigger a load was a
 * `useFocusEffect` inside the home screen's flow ring.
 */
export function useFlowDays(): DayData[] {
  const { data, setData } = useData();
  const { databaseChange } = useDatabaseChangeNotifier();

  useEffect(() => {
    let stale = false;

    loadFlowDays()
      .then((days) => {
        if (!stale) setData(days);
      })
      .catch((error) => {
        console.error("Error loading flow days:", error);
      });

    return () => {
      stale = true;
    };
  }, [databaseChange, setData]);

  return data;
}
