import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CurrentCycleState,
  CycleStats,
  DayData,
  PredictedDate,
} from "@/constants/Interfaces";
import { currentCycleState, cycleStats } from "@/services/cyclePredictionLogic";
import { getPredictionAccuracy } from "@/db/database";

interface UseCyclePhaseResult {
  cycleState: CurrentCycleState | null;
  stats: CycleStats | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Subscribes to prediction accuracy and hands the cycle rules their inputs.
 *
 * The rules themselves live in services/cyclePredictionLogic.ts, which is the
 * one definition of a Cycle. This file used to carry a private copy of the
 * grouping, average length, variation and phase logic; that copy answered
 * differently and could not be tested, because it imported the database and
 * called new Date() inside a memo.
 *
 * `referenceDay` is a parameter for the same reason it is one everywhere else
 * in this module: the caller owns "today".
 */
export function useCyclePhase(
  flowData: DayData[],
  predictedCycle: PredictedDate[],
  referenceDay: Date,
): UseCyclePhaseResult {
  const [loading, setLoading] = useState(true);
  const [predictionAccuracy, setPredictionAccuracy] = useState(0);

  const loadAccuracy = useCallback(async () => {
    try {
      const accuracy = await getPredictionAccuracy();
      setPredictionAccuracy(accuracy.accuracyPercentage);
    } catch {
      setPredictionAccuracy(0);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAccuracy().finally(() => setLoading(false));
  }, [loadAccuracy]);

  const cycleState = useMemo(
    () => currentCycleState(flowData, predictedCycle, referenceDay),
    [flowData, predictedCycle, referenceDay],
  );

  const stats = useMemo(
    () => cycleStats(flowData, predictionAccuracy),
    [flowData, predictionAccuracy],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadAccuracy();
    setLoading(false);
  }, [loadAccuracy]);

  return { cycleState, stats, loading, refresh };
}
