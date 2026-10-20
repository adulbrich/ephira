import type { DayData, PredictedDate } from "@/constants/Interfaces";
import { CYCLE_PREDICTION_CONSTANTS } from "@/constants/CyclePrediction";
import {
  countCompleteCycles,
  hasEnoughCyclesForPrediction,
} from "@/services/cyclePredictionLogic";
import { refreshPredictions } from "@/services/cyclePredictions";
import { getAllDays } from "@/db/database";
import { PREDICTION_FILTER, changeFilters } from "@/db/selectedFilters";
import { insertSetting } from "@/db/operations/settings";
import { SettingsKeys } from "@/constants/Settings";

/** Whether the logged Days support predicting, and what to tell the user. */
export type PredictionAvailability = {
  cycleCount: number;
  hasEnough: boolean;
  message: string;
};

/**
 * Whether Prediction is available, counted through the one definition.
 *
 * Pure, and takes the Days rather than reading them, so the sentence the user
 * sees can be asserted without a database. CONTEXT.md, Cycle: a Cycle counts
 * towards prediction only once it reaches MIN_CONSECUTIVE_DAYS, and that same
 * count is what gates predictions everywhere they are gated.
 */
export function predictionAvailability(
  flowDays: DayData[],
): PredictionAvailability {
  if (flowDays.length === 0) {
    return {
      cycleCount: 0,
      hasEnough: false,
      message: "No flow data logged yet. Start logging to enable predictions!",
    };
  }

  const cycleCount = countCompleteCycles(flowDays);
  const hasEnough = hasEnoughCyclesForPrediction(flowDays);

  if (hasEnough) {
    return {
      cycleCount,
      hasEnough,
      message: `Great! You have ${cycleCount} complete cycles logged.`,
    };
  }

  const needed =
    CYCLE_PREDICTION_CONSTANTS.MIN_CYCLES_FOR_PREDICTION - cycleCount;

  return {
    cycleCount,
    hasEnough,
    message: `You have ${cycleCount} cycle${cycleCount === 1 ? "" : "s"}. Log ${needed} more complete cycle${needed === 1 ? "" : "s"} for predictions.`,
  };
}

/**
 * Apply the user's choice: the durable preference, the filter list and the
 * forecast move together.
 *
 * Only the user writes the choice. Data never does: too few complete Cycles
 * makes the forecast empty (see `refreshPredictions`), it does not turn the
 * choice off.
 */
export async function applyPredictionChoice({
  choice,
  filters,
  referenceDay,
}: {
  choice: boolean;
  filters: string[];
  referenceDay: Date;
}): Promise<{
  choice: boolean;
  filters: string[];
  predictions: PredictedDate[];
}> {
  await insertSetting(SettingsKeys.cyclePredictions, JSON.stringify(choice));

  const nextFilters = await changeFilters(
    filters,
    choice ? { add: PREDICTION_FILTER } : { remove: PREDICTION_FILTER },
  );

  const predictions = choice ? await refreshPredictions(referenceDay) : [];

  return { choice, filters: nextFilters, predictions };
}

/** Prediction Availability for the Days logged now. */
export async function loadPredictionAvailability(): Promise<PredictionAvailability> {
  const allDays = await getAllDays();
  return predictionAvailability(
    allDays.filter((day) => day.flow_intensity) as DayData[],
  );
}
