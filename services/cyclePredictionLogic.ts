/**
 * Cycle prediction logic – pure functions for grouping flow data,
 * computing average cycle length, confidence, and future predictions.
 * Used by useFetchCycleData; designed for testability with no DB dependency.
 */

import { DayData, PredictedDate } from "@/constants/Interfaces";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";

export interface GroupedCycle {
  dates: string[];
  startDate: string;
  endDate: string;
  isManuallyMarked: boolean;
}

export interface GeneratePredictionsOptions {
  /** Reference "today" for future-only predictions (default: new Date()) */
  referenceDate?: Date;
  /** Max future cycles to predict (default: from constants) */
  maxFutureCycles?: number;
}

/**
 * Check if two dates are consecutive calendar days.
 * Uses date comparison to avoid DST/timezone issues.
 */
export function areConsecutive(date1: string, date2: string): boolean {
  const d1 = new Date(date1 + "T00:00:00");
  const d2 = new Date(date2 + "T00:00:00");
  const utcDate1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utcDate2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const diffDays = Math.abs((utcDate2 - utcDate1) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Group consecutive flow days into cycles.
 * Respects manual cycle start/end markers when present.
 */
export function groupFlowIntoCycles(flowData: DayData[]): GroupedCycle[] {
  const sorted = [...flowData].sort(
    (a, b) => new Date(a.date).valueOf() - new Date(b.date).valueOf()
  );
  let lastDate: string | null = null;
  const grouped: GroupedCycle[] = [];

  sorted.forEach((data) => {
    const isNewCycleStart = data.is_cycle_start === true;
    const isPreviousCycleEnd =
      grouped.length > 0 &&
      grouped[grouped.length - 1].endDate === lastDate &&
      flowData.find((d) => d.date === lastDate)?.is_cycle_end === true;
    const shouldStartNewCycle =
      isNewCycleStart ||
      isPreviousCycleEnd ||
      !lastDate ||
      !areConsecutive(lastDate!, data.date);

    if (lastDate && !shouldStartNewCycle) {
      const lastGroup = grouped[grouped.length - 1];
      lastGroup.dates.push(data.date);
      lastGroup.endDate = data.date;
    } else {
      grouped.push({
        dates: [data.date],
        startDate: data.date,
        endDate: data.date,
        isManuallyMarked: isNewCycleStart,
      });
    }
    lastDate = data.date;
  });

  return grouped;
}

/**
 * Calculate average cycle length from grouped cycles.
 * Returns DEFAULT_CYCLE_LENGTH when there are fewer than 2 valid cycles
 * or no cycle lengths in the valid range (21–35 days).
 */
export function calculateAverageCycleLength(
  cycles: GroupedCycle[]
): number {
  const validCycles = cycles.filter(
    (c) => c.dates.length >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS
  );
  if (validCycles.length < 2) {
    return CYCLE_PREDICTION_CONSTANTS.DEFAULT_CYCLE_LENGTH;
  }

  const cycleLengths: number[] = [];
  for (let i = 1; i < validCycles.length; i++) {
    const prev = new Date(validCycles[i - 1].startDate + "T00:00:00");
    const curr = new Date(validCycles[i].startDate + "T00:00:00");
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
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
  const sum = cycleLengths.reduce((a, b) => a + b, 0);
  return Math.round(sum / cycleLengths.length);
}

/**
 * Calculate confidence score (0–100) from cycle regularity, amount of data, and recency.
 * referenceDate is used for recency; defaults to now when omitted.
 */
export function calculateConfidence(
  cycles: GroupedCycle[],
  cycleLengths: number[],
  referenceDate: Date = new Date()
): number {
  if (cycleLengths.length < 2) {
    return 30;
  }

  const average =
    cycleLengths.reduce((acc, len) => acc + len, 0) / cycleLengths.length;
  const variance =
    cycleLengths.reduce(
      (acc, len) => acc + Math.pow(len - average, 2),
      0
    ) / cycleLengths.length;
  const stdDev = Math.sqrt(variance);

  let regularityScore: number;
  if (stdDev <= 2) regularityScore = 100;
  else if (stdDev <= 4) regularityScore = 75;
  else if (stdDev <= 7) regularityScore = 50;
  else regularityScore = 25;

  let dataAmountScore: number;
  if (cycleLengths.length >= 6) dataAmountScore = 100;
  else if (cycleLengths.length >= 4) dataAmountScore = 75;
  else dataAmountScore = 50;

  const validCycles = cycles.filter(
    (c) => c.dates.length >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS
  );
  const lastCycle = validCycles[validCycles.length - 1];
  const lastEnd = new Date(lastCycle.endDate + "T00:00:00");
  const daysSinceLast = Math.floor(
    (referenceDate.getTime() - lastEnd.getTime()) / (1000 * 60 * 60 * 24)
  );

  let recencyScore: number;
  if (daysSinceLast <= 60) recencyScore = 100;
  else if (daysSinceLast <= 90) recencyScore = 75;
  else if (daysSinceLast <= 120) recencyScore = 50;
  else recencyScore = 25;

  const confidence = Math.round(
    regularityScore * 0.7 + dataAmountScore * 0.2 + recencyScore * 0.1
  );
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Generate future cycle predictions from flow data.
 * Returns [] when there is no flow data or no valid cycle (3+ consecutive days).
 * referenceDate is used as "today" so only future dates are included (test-friendly).
 */
export function generatePredictions(
  flowData: DayData[],
  options: GeneratePredictionsOptions = {}
): PredictedDate[] {
  const referenceDate =
    options.referenceDate ? new Date(options.referenceDate) : new Date();
  const maxCycles =
    options.maxFutureCycles ??
    CYCLE_PREDICTION_CONSTANTS.MAX_FUTURE_CYCLES;

  const flowDays = flowData.filter(
    (d) =>
      d.flow_intensity !== undefined &&
      d.flow_intensity !== null &&
      d.flow_intensity > 0
  );
  if (flowDays.length === 0) return [];

  const cycles = groupFlowIntoCycles(flowDays);
  const validCycles = cycles.filter(
    (c) => c.dates.length >= CYCLE_PREDICTION_CONSTANTS.MIN_CONSECUTIVE_DAYS
  );
  if (validCycles.length === 0) return [];

  const lastCycle = validCycles[validCycles.length - 1];
  const averageCycleLength = calculateAverageCycleLength(cycles);

  const cycleLengths: number[] = [];
  for (let i = 1; i < validCycles.length; i++) {
    const prev = new Date(validCycles[i - 1].startDate + "T00:00:00");
    const curr = new Date(validCycles[i].startDate + "T00:00:00");
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (
      diffDays >= CYCLE_PREDICTION_CONSTANTS.MIN_CYCLE_LENGTH &&
      diffDays <= CYCLE_PREDICTION_CONSTANTS.MAX_CYCLE_LENGTH
    ) {
      cycleLengths.push(diffDays);
    }
  }

  const baseConfidence = calculateConfidence(
    cycles,
    cycleLengths,
    referenceDate
  );

  const predictedDates: PredictedDate[] = [];
  const lastCycleStart = new Date(lastCycle.startDate + "T00:00:00");
  const cycleDuration = lastCycle.dates.length;

  for (let cycleNum = 1; cycleNum <= maxCycles; cycleNum++) {
    const predictedCycleStart = new Date(lastCycleStart);
    predictedCycleStart.setDate(
      predictedCycleStart.getDate() + averageCycleLength * cycleNum
    );

    if (predictedCycleStart <= referenceDate) continue;

    const confidenceMultiplier = 1 - (cycleNum - 1) * 0.1;
    const cycleConfidence = Math.round(baseConfidence * confidenceMultiplier);

    for (let day = 0; day < cycleDuration; day++) {
      const d = new Date(predictedCycleStart);
      d.setDate(d.getDate() + day);
      if (d > referenceDate) {
        predictedDates.push({
          date: d.toISOString().split("T")[0],
          confidence: cycleConfidence,
        });
      }
    }
  }

  return predictedDates;
}
