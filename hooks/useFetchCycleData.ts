import { useCallback } from "react";
import { getAllDays, savePredictions } from "@/db/database";
import { DayData, PredictedDate } from "@/constants/Interfaces";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";
import { generatePredictions } from "@/services/cyclePredictionLogic";
import { NotificationService } from "@/services/notificationService";

interface GroupedCycle {
  dates: string[];
  startDate: string;
  endDate: string;
  isManuallyMarked: boolean;
}

/**
 * Check if two dates are consecutive calendar days
 * Uses date comparison instead of millisecond difference to avoid DST/timezone issues
 */
function areConsecutive(date1: string, date2: string): boolean {
  const d1 = new Date(date1 + "T00:00:00");
  const d2 = new Date(date2 + "T00:00:00");

  // Normalize to UTC midnight to avoid timezone issues
  const utcDate1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utcDate2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());

  const diffDays = Math.abs((utcDate2 - utcDate1) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Group consecutive flow days into cycles
 * Respects manual cycle start/end markers when present
 */
function renderCycles(flowData: DayData[]): GroupedCycle[] {
  let lastDate: string | null = null;

  // Collect consecutive days and group them together
  const groupedDates: GroupedCycle[] = [];

  flowData.forEach((data) => {
    const isNewCycleStart = data.is_cycle_start === true;
    const isPreviousCycleEnd =
      groupedDates.length > 0 &&
      groupedDates[groupedDates.length - 1].endDate === lastDate &&
      flowData.find((d) => d.date === lastDate)?.is_cycle_end === true;

    // Start a new cycle if:
    // 1. Manual cycle start marker is set
    // 2. Previous cycle has a manual end marker
    // 3. Dates are not consecutive (gap detected)
    const shouldStartNewCycle =
      isNewCycleStart ||
      isPreviousCycleEnd ||
      !lastDate ||
      !areConsecutive(lastDate, data.date);

    if (lastDate && !shouldStartNewCycle) {
      // If last date is consecutive and no markers, add to current group
      const lastGroup = groupedDates[groupedDates.length - 1];
      lastGroup.dates.push(data.date);
      lastGroup.endDate = data.date;
    } else {
      // Create a new group
      groupedDates.push({
        dates: [data.date],
        startDate: data.date,
        endDate: data.date,
        isManuallyMarked: isNewCycleStart,
      });
    }

    lastDate = data.date;
  });

  return groupedDates;
}

/**
 * Calculate average cycle length from historical data
 * A cycle is defined as the number of days from one cycle start to the next
 * Prioritizes manually marked cycles for accuracy
 */
function calculateAverageCycleLength(cycles: GroupedCycle[]): number {
  // Filter to only valid cycles (3+ consecutive days)
  const validCycles = cycles.filter(
    (cycle) =>
      cycle.dates.length >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS,
  );

  // Need at least 2 cycles to calculate an average
  if (validCycles.length < 2) {
    return CYCLE_PREDICTION_CONSTANTS.DEFAULT_CYCLE_LENGTH;
  }

  // Calculate the number of days between cycle starts
  const cycleLengths: number[] = [];
  for (let i = 1; i < validCycles.length; i++) {
    const prevCycleStart = new Date(validCycles[i - 1].startDate + "T00:00:00");
    const currCycleStart = new Date(validCycles[i].startDate + "T00:00:00");

    const diffTime = currCycleStart.getTime() - prevCycleStart.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Only include reasonable cycle lengths
    if (
      diffDays >= CYCLE_PREDICTION_CONSTANTS.MIN_CYCLE_LENGTH &&
      diffDays <= CYCLE_PREDICTION_CONSTANTS.MAX_CYCLE_LENGTH
    ) {
      cycleLengths.push(diffDays);
    }
  }

  // If no valid cycle lengths found, use default
  if (cycleLengths.length === 0) {
    return CYCLE_PREDICTION_CONSTANTS.DEFAULT_CYCLE_LENGTH;
  }

  // Calculate average and round to nearest day
  const sum = cycleLengths.reduce((acc, length) => acc + length, 0);
  return Math.round(sum / cycleLengths.length);
}

/**
 * Calculate confidence score for predictions (0-100)
 * Based on:
 * - Cycle regularity (70% weight): How consistent are cycle lengths?
 * - Amount of data (20% weight): More cycles = higher confidence
 * - Recency (10% weight): Recent data = higher confidence
 */
function calculateConfidence(
  cycles: GroupedCycle[],
  cycleLengths: number[],
): number {
  // Need at least 2 cycles to calculate confidence
  if (cycleLengths.length < 2) {
    return 30; // Low confidence with minimal data
  }

  // 1. Calculate cycle regularity score (70% weight)
  const average =
    cycleLengths.reduce((acc, len) => acc + len, 0) / cycleLengths.length;
  const variance =
    cycleLengths.reduce((acc, len) => acc + Math.pow(len - average, 2), 0) /
    cycleLengths.length;
  const standardDeviation = Math.sqrt(variance);

  // Lower std dev = more regular = higher score
  // If std dev is 0-2 days: 100%, 3-4 days: 75%, 5-7 days: 50%, 8+ days: 25%
  let regularityScore: number;
  if (standardDeviation <= 2) {
    regularityScore = 100;
  } else if (standardDeviation <= 4) {
    regularityScore = 75;
  } else if (standardDeviation <= 7) {
    regularityScore = 50;
  } else {
    regularityScore = 25;
  }

  // 2. Calculate data amount score (20% weight)
  // 2-3 cycles: 50%, 4-5 cycles: 75%, 6+ cycles: 100%
  let dataAmountScore: number;
  if (cycleLengths.length >= 6) {
    dataAmountScore = 100;
  } else if (cycleLengths.length >= 4) {
    dataAmountScore = 75;
  } else {
    dataAmountScore = 50;
  }

  // 3. Calculate recency score (10% weight)
  // Check how recent the last cycle is
  const validCycles = cycles.filter(
    (cycle) =>
      cycle.dates.length >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS,
  );
  const lastCycle = validCycles[validCycles.length - 1];
  const lastCycleDate = new Date(lastCycle.endDate + "T00:00:00");
  const today = new Date();
  const daysSinceLastCycle = Math.floor(
    (today.getTime() - lastCycleDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Within 60 days: 100%, 60-90 days: 75%, 90-120 days: 50%, 120+ days: 25%
  let recencyScore: number;
  if (daysSinceLastCycle <= 60) {
    recencyScore = 100;
  } else if (daysSinceLastCycle <= 90) {
    recencyScore = 75;
  } else if (daysSinceLastCycle <= 120) {
    recencyScore = 50;
  } else {
    recencyScore = 25;
  }

  // Weighted average
  const confidence = Math.round(
    regularityScore * 0.7 + dataAmountScore * 0.2 + recencyScore * 0.1,
  );

  return Math.max(0, Math.min(100, confidence));
}

export function useFetchCycleData(
  setPredictedCycle: (values: PredictedDate[]) => void,
) {
  const fetchCycleData = useCallback(async () => {
    try {
      const allDays = await getAllDays();
      const flowDays = allDays.filter((day) => day.flow_intensity);

      if (flowDays.length === 0) {
        setPredictedCycle([]);
        return [];
      }

      const sortedFlowDays: DayData[] = flowDays
        .map((day) => ({
          ...day,
          flow_intensity: day.flow_intensity ?? 0,
          is_cycle_start: day.is_cycle_start ?? undefined,
          is_cycle_end: day.is_cycle_end ?? undefined,
          notes: day.notes ?? undefined,
        }))
        .sort((a, b) => {
          const dateA = new Date(`${a.date}`).valueOf();
          const dateB = new Date(`${b.date}`).valueOf();
          return dateA > dateB ? 1 : -1;
        });

      const day = new Date();
      const offset = day.getTimezoneOffset();
      const localDate = new Date(day.getTime() - offset * 60 * 1000);

      const predictedDates = generatePredictions(sortedFlowDays, {
        referenceDate: localDate,
      });

      setPredictedCycle(predictedDates);

      if (predictedDates.length > 0) {
        try {
          await savePredictions(predictedDates);
          await NotificationService.scheduleAllPredictionNotifications(
            predictedDates,
          );
        } catch (saveError) {
          console.error("Error saving predictions:", saveError);
        }
      }

      return predictedDates;
    } catch (error) {
      console.error("Error fetching cycle data:", error);
      setPredictedCycle([]);
      return [];
    }
  }, [setPredictedCycle]);

  return { fetchCycleData };
}
