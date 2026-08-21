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
 * Apply a change of choice, whoever made it.
 *
 * The durable preference, the filter list and the forecast move together. The
 * user's toggle and the data revoking the choice used to be two code paths
 * that did different subsets of this, which is how the toggle came to write
 * the preference while the revocation wrote it and then left the filter behind
 * in the store only.
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

/**
 * Read availability and revoke the choice if the data no longer supports it.
 *
 * Revocation is a real consequence -- it silently takes away something the
 * user turned on -- so it goes through the same write path as the toggle
 * rather than a private copy of half of it.
 */
export async function reconcilePredictionChoice({
  choice,
  filters,
  referenceDay,
}: {
  choice: boolean;
  filters: string[];
  referenceDay: Date;
}): Promise<
  | { availability: PredictionAvailability; revoked: false }
  | {
      availability: PredictionAvailability;
      revoked: true;
      filters: string[];
    }
> {
  const allDays = await getAllDays();
  const availability = predictionAvailability(
    allDays.filter((day) => day.flow_intensity) as DayData[],
  );

  if (availability.hasEnough || !choice)
    return { availability, revoked: false };

  const applied = await applyPredictionChoice({
    choice: false,
    filters,
    referenceDay,
  });

  return { availability, revoked: true, filters: applied.filters };
}
