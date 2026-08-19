import { getAllDays } from "@/db/database";
import { savePredictions } from "@/db/operations/predictionSnapshots";
import type { DayData, PredictedDate } from "@/constants/Interfaces";
import { generatePredictions } from "@/services/cyclePredictionLogic";
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
 * Notification scheduling is best effort: a user who declined the permission
 * still gets their predictions.
 */
export async function refreshPredictions(
  referenceDay: Date,
): Promise<PredictedDate[]> {
  const allDays = await getAllDays();

  const flowDays: DayData[] = allDays
    .filter((day) => day.flow_intensity)
    .map((day) => ({
      ...day,
      flow_intensity: day.flow_intensity ?? 0,
      is_cycle_start: day.is_cycle_start ?? undefined,
      is_cycle_end: day.is_cycle_end ?? undefined,
      notes: day.notes ?? undefined,
    }));

  if (flowDays.length === 0) return [];

  const predictions = generatePredictions(flowDays, {
    referenceDate: referenceDay,
  });

  if (predictions.length === 0) return [];

  await savePredictions(predictions, referenceDay);

  try {
    await NotificationService.scheduleAllPredictionNotifications(predictions);
  } catch (error) {
    console.error("Error scheduling prediction notifications:", error);
  }

  return predictions;
}
