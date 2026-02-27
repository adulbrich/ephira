import { useMemo, useState, useEffect, useCallback } from "react";
import {
  DayData,
  PredictedDate,
  CurrentCycleState,
  CycleStats,
} from "@/constants/Interfaces";
import {
  CyclePhaseId,
  getAdjustedPhaseBoundaries,
} from "@/constants/CyclePhases";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";
import { getPredictionAccuracy } from "@/db/database";

interface GroupedCycle {
  dates: string[];
  startDate: string;
  endDate: string;
}

interface UseCyclePhaseResult {
  cycleState: CurrentCycleState | null;
  stats: CycleStats | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Check if two dates are consecutive calendar days
 */
function areConsecutive(date1: string, date2: string): boolean {
  const d1 = new Date(date1 + "T00:00:00");
  const d2 = new Date(date2 + "T00:00:00");
  const utcDate1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utcDate2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const diffDays = Math.abs((utcDate2 - utcDate1) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Group consecutive flow days into cycles
 */
function groupIntoCycles(flowData: DayData[]): GroupedCycle[] {
  const sortedFlowDays = [...flowData]
    .filter((day) => day.flow_intensity && day.flow_intensity > 0)
    .sort((a, b) => new Date(a.date).valueOf() - new Date(b.date).valueOf());

  if (sortedFlowDays.length === 0) return [];

  const cycles: GroupedCycle[] = [];
  let lastDate: string | null = null;

  sortedFlowDays.forEach((data) => {
    const isNewCycleStart = data.is_cycle_start === true;
    const isPreviousCycleEnd =
      cycles.length > 0 &&
      cycles[cycles.length - 1].endDate === lastDate &&
      flowData.find((d) => d.date === lastDate)?.is_cycle_end === true;

    const shouldStartNewCycle =
      isNewCycleStart ||
      isPreviousCycleEnd ||
      !lastDate ||
      !areConsecutive(lastDate, data.date);

    if (lastDate && !shouldStartNewCycle) {
      const lastCycle = cycles[cycles.length - 1];
      lastCycle.dates.push(data.date);
      lastCycle.endDate = data.date;
    } else {
      cycles.push({
        dates: [data.date],
        startDate: data.date,
        endDate: data.date,
      });
    }

    lastDate = data.date;
  });

  return cycles;
}

/**
 * Calculate average cycle length from historical cycles
 */
function calculateAverageCycleLength(cycles: GroupedCycle[]): number {
  const validCycles = cycles.filter(
    (cycle) =>
      cycle.dates.length >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS,
  );

  if (validCycles.length < 2) {
    return CYCLE_PREDICTION_CONSTANTS.DEFAULT_CYCLE_LENGTH;
  }

  const cycleLengths: number[] = [];
  for (let i = 1; i < validCycles.length; i++) {
    const prevStart = new Date(validCycles[i - 1].startDate + "T00:00:00");
    const currStart = new Date(validCycles[i].startDate + "T00:00:00");
    const diffDays = Math.round(
      (currStart.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (
      diffDays >= CYCLE_PREDICTION_CONSTANTS.MIN_CYCLE_LENGTH &&
      diffDays <= CYCLE_PREDICTION_CONSTANTS.MAX_CYCLE_LENGTH
    ) {
      cycleLengths.push(diffDays);
    }
  }

  if (cycleLengths.length === 0) {
    return CYCLE_PREDICTION_CONSTANTS.DEFAULT_CYCLE_LENGTH;
  }

  return Math.round(
    cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length,
  );
}

/**
 * Calculate cycle variation (standard deviation)
 */
function calculateCycleVariation(cycles: GroupedCycle[]): number {
  const validCycles = cycles.filter(
    (cycle) =>
      cycle.dates.length >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS,
  );

  if (validCycles.length < 2) return 0;

  const cycleLengths: number[] = [];
  for (let i = 1; i < validCycles.length; i++) {
    const prevStart = new Date(validCycles[i - 1].startDate + "T00:00:00");
    const currStart = new Date(validCycles[i].startDate + "T00:00:00");
    const diffDays = Math.round(
      (currStart.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (
      diffDays >= CYCLE_PREDICTION_CONSTANTS.MIN_CYCLE_LENGTH &&
      diffDays <= CYCLE_PREDICTION_CONSTANTS.MAX_CYCLE_LENGTH
    ) {
      cycleLengths.push(diffDays);
    }
  }

  if (cycleLengths.length < 2) return 0;

  const avg = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
  const variance =
    cycleLengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) /
    cycleLengths.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

/**
 * Determine current phase based on cycle day
 */
function determinePhase(cycleDay: number, cycleLength: number): CyclePhaseId {
  const boundaries = getAdjustedPhaseBoundaries(cycleLength);

  if (cycleDay <= boundaries.menstrualEnd) {
    return "menstrual";
  } else if (cycleDay <= boundaries.follicularEnd) {
    return "follicular";
  } else if (cycleDay <= boundaries.ovulationEnd) {
    return "ovulation";
  } else {
    return "luteal";
  }
}

/**
 * Hook to calculate current cycle phase and statistics
 */
export function useCyclePhase(
  flowData: DayData[],
  predictedCycle: PredictedDate[],
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

  const cycles = useMemo(() => groupIntoCycles(flowData), [flowData]);

  const validCycles = useMemo(
    () =>
      cycles.filter(
        (cycle) =>
          cycle.dates.length >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS,
      ),
    [cycles],
  );

  const cycleState = useMemo((): CurrentCycleState | null => {
    if (validCycles.length === 0) {
      return null;
    }

    const lastCycle = validCycles[validCycles.length - 1];
    const cycleLength = calculateAverageCycleLength(cycles);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const lastStart = new Date(lastCycle.startDate + "T00:00:00");

    // Calculate days since last period started
    const daysSinceStart = Math.floor(
      (today.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Cycle day (1-indexed, wraps around)
    let cycleDay = (daysSinceStart % cycleLength) + 1;
    if (daysSinceStart < 0) cycleDay = 1;

    // Check if currently on period (has flow logged today)
    const todayData = flowData.find((d) => d.date === todayStr);
    const isCurrentlyOnPeriod =
      todayData && todayData.flow_intensity && todayData.flow_intensity > 0;

    // Determine phase
    let currentPhase = determinePhase(cycleDay, cycleLength);

    // Override to menstrual if currently bleeding
    if (isCurrentlyOnPeriod) {
      currentPhase = "menstrual";
    }

    // Days until next period
    const daysUntilNextPeriod = cycleLength - cycleDay + 1;

    // Next predicted start date
    const nextPredictedStart =
      predictedCycle.length > 0 ? predictedCycle[0].date : null;

    // Confidence from predictions; 0 when no predictions (UI shows "Low confidence")
    const confidence =
      predictedCycle.length > 0 ? predictedCycle[0].confidence : 0;

    // Need at least 2 cycles for reliable predictions
    const hasEnoughData =
      validCycles.length >=
      CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION;

    return {
      currentPhase,
      cycleDay,
      cycleLength,
      daysUntilNextPeriod,
      lastPeriodStart: lastCycle.startDate,
      nextPredictedStart,
      confidence,
      hasEnoughData,
    };
  }, [validCycles, cycles, flowData, predictedCycle]);

  const stats = useMemo((): CycleStats | null => {
    if (validCycles.length === 0) {
      return null;
    }

    const avgLength = calculateAverageCycleLength(cycles);
    const variation = calculateCycleVariation(cycles);

    return {
      averageCycleLength: avgLength,
      cycleVariation: variation,
      totalCyclesTracked: validCycles.length,
      predictionAccuracy,
      isRegular: variation <= 3,
    };
  }, [cycles, validCycles, predictionAccuracy]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadAccuracy();
    setLoading(false);
  }, [loadAccuracy]);

  return { cycleState, stats, loading, refresh };
}
