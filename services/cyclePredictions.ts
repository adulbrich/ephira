import { loadFlowDays } from "@/db/flowDays";
import { savePredictions } from "@/db/operations/predictionSnapshots";
import type { PredictedDate } from "@/constants/Interfaces";
import {
  generatePredictions,
  hasEnoughCyclesForPrediction,
} from "@/services/cyclePredictionLogic";
import { NotificationService } from "@/services/notificationService";

/**
 * Generates predictions and reconciles them against what is already stored,
 * so that running it twice changes nothing.
 *
 * generatePredictions was extracted as pure and is well tested; the write
 * amplification defect lived entirely in how its result was persisted at the
 * call site, where no test reached. Predict and persist are one operation
 * here, with a name, so there is somewhere for that test to go.
 *
 * `referenceDay` is a required parameter. It is both what counts as "today"
 * for the prediction and the date the resulting snapshots are stamped with,
 * which keeps those two from disagreeing across a timezone boundary.
 *
 * Availability gates it: with fewer complete Cycles than prediction needs it
 * forecasts nothing, whatever the user chose. Every screen gets its forecast
 * here, so this is the one place that gate has to hold.
 *
 * An empty forecast is reconciled like any other: today's unmeasured
 * snapshots are retracted and the reminders scheduled from an earlier
 * forecast are cleared. Returning early instead left both behind when the
 * data stopped supporting them.
 *
 * Notification scheduling is best effort: a user who declined the permission
 * still gets their predictions.
 */
export async function refreshPredictions(
  referenceDay: Date,
): Promise<PredictedDate[]> {
  const flowDays = await loadFlowDays();

  const predictions = hasEnoughCyclesForPrediction(flowDays)
    ? generatePredictions(flowDays, { referenceDate: referenceDay })
    : [];

  await savePredictions(predictions, referenceDay);

  try {
    await NotificationService.scheduleAllPredictionNotifications(predictions);
  } catch (error) {
    console.error("Error scheduling prediction notifications:", error);
  }

  return predictions;
}
