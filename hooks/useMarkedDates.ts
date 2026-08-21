import { useEffect, useMemo, useState } from "react";
import type { MarkedDates, PredictedDate } from "@/constants/Interfaces";
import {
  usePredictedCycle,
  usePredictionChoice,
} from "@/stores/calendar-storage";
import { useLoggedDaysLive } from "@/hooks/useLoggedDaysLive";
import { useCatalogue } from "@/hooks/useCatalogue";
import { cycleMarkedDates } from "@/services/cycleMarkedDates";
import { refreshPredictions } from "@/services/cyclePredictions";
import { startOfLocalDay } from "@/utils/dates";
import { PREDICTION_FILTER } from "@/db/selectedFilters";

/**
 * Fetch, and hold state. The rules are in `services/cycleMarkedDates.ts`.
 *
 * What used to be here was the whole cycle marking rule set, inside an async
 * effect, unreachable by any test. This keeps only the three things that are
 * genuinely bound to the app: the live query, the Catalogue subscription, and
 * refreshing the forecast. Drawing is a pure derivation of those.
 */
export function useMarkedDates(calendarFilters?: string[]) {
  const days = useLoggedDaysLive();
  const catalogue = useCatalogue();

  const { setPredictedCycle } = usePredictedCycle();
  const { predictionChoice } = usePredictionChoice();
  // refreshPredictions is a plain function, so there is no changing callback
  // identity to hold in a ref the way the hook it replaced needed.
  const referenceDay = useMemo(() => startOfLocalDay(), []);

  const filters = useMemo(() => calendarFilters ?? [], [calendarFilters]);
  const wantsPredictions =
    filters.includes(PREDICTION_FILTER) && predictionChoice === true;

  const [predictions, setPredictions] = useState<PredictedDate[]>([]);

  // Forecasting is the one part of this that writes: refreshPredictions
  // reconciles prediction_snapshots and reschedules notifications. It runs when
  // the logged Days change, or when the choice to show Predictions does.
  //
  // The Selected Date is deliberately not a dependency. It used to be, and
  // nothing in the effect read it, so every day tap fired a snapshot write and
  // a notification reschedule.
  useEffect(() => {
    if (!wantsPredictions) {
      setPredictions([]);
      return;
    }

    let stale = false;
    refreshPredictions(referenceDay)
      .then((next) => {
        if (stale) return;
        setPredictions(next);
        setPredictedCycle(next);
      })
      .catch((error) => {
        console.error("Error refreshing predictions:", error);
      });

    return () => {
      stale = true;
    };
  }, [wantsPredictions, days, referenceDay, setPredictedCycle]);

  const markedDates: MarkedDates = useMemo(
    () => cycleMarkedDates({ days, filters, catalogue, predictions }),
    [days, filters, catalogue, predictions],
  );

  return { markedDates };
}
