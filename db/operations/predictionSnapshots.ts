import { getDrizzleDatabase } from "@/db/operations/setup";
import { predictionSnapshots } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

const db = getDrizzleDatabase();

/**
 * Reconciles a generated set of predictions against what is already stored for
 * the same day, so that running it twice changes nothing.
 *
 * `prediction_snapshots` exists to hold a time series: what was predicted, and
 * when. Re-running on the same day is not new information, so it updates the
 * existing generation in place; a new day writes a new one. Predictions the
 * same day no longer forecasts are retracted, unless their outcome has already
 * been measured, because rewriting a measured outcome would change what the
 * accuracy metric is measuring.
 *
 * `predictionMadeDate` is a parameter rather than a clock read. Callers pass
 * the same reference date they hand to `generatePredictions`, and it is
 * formatted with `toISOString` to match how that module writes date strings.
 */
export const savePredictions = async (
  predictions: { date: string; confidence: number }[],
  predictionMadeDate: Date,
) => {
  const madeOn = predictionMadeDate.toISOString().split("T")[0];

  const existing = await db
    .select()
    .from(predictionSnapshots)
    .where(eq(predictionSnapshots.prediction_made_date, madeOn));

  const forecast = new Map(predictions.map((p) => [p.date, p.confidence]));

  // Newest row per predicted date is the one kept. Older ones are duplicates
  // left by the unconditional insert this function replaces.
  const kept = new Map<string, (typeof existing)[number]>();
  const superseded: typeof existing = [];
  for (const row of existing) {
    const held = kept.get(row.predicted_date);
    if (!held) {
      kept.set(row.predicted_date, row);
    } else if (row.id > held.id) {
      kept.set(row.predicted_date, row);
      superseded.push(held);
    } else {
      superseded.push(row);
    }
  }

  for (const [predictedDate, confidence] of forecast) {
    const row = kept.get(predictedDate);

    if (!row) {
      await db.insert(predictionSnapshots).values({
        prediction_made_date: madeOn,
        predicted_date: predictedDate,
        confidence,
        actual_had_flow: null,
        checked_date: null,
      });
    } else if (row.confidence !== confidence) {
      await db
        .update(predictionSnapshots)
        .set({ confidence })
        .where(eq(predictionSnapshots.id, row.id));
    }
  }

  const retracted = [...kept.values()].filter(
    (row) => !forecast.has(row.predicted_date),
  );

  for (const row of [...superseded, ...retracted]) {
    if (row.actual_had_flow !== null) continue;
    await db
      .delete(predictionSnapshots)
      .where(eq(predictionSnapshots.id, row.id));
  }
};

/**
 * Check predictions against actual data and update accuracy
 */
export const checkPredictionAccuracy = async (
  date: string,
  hadFlow: boolean,
) => {
  // Find all unchecked predictions for this date
  const predictions = await db
    .select()
    .from(predictionSnapshots)
    .where(
      and(
        eq(predictionSnapshots.predicted_date, date),
        isNull(predictionSnapshots.actual_had_flow),
      ),
    );

  if (predictions.length > 0) {
    // Update all predictions for this date
    await db
      .update(predictionSnapshots)
      .set({
        actual_had_flow: hadFlow,
        checked_date: new Date().toISOString().split("T")[0],
      })
      .where(
        and(
          eq(predictionSnapshots.predicted_date, date),
          isNull(predictionSnapshots.actual_had_flow),
        ),
      );
  }
};

/**
 * Get overall prediction accuracy statistics
 */
export const getPredictionAccuracy = async (): Promise<{
  totalChecked: number;
  totalCorrect: number;
  accuracyPercentage: number;
}> => {
  const allCheckedPredictions = await db
    .select()
    .from(predictionSnapshots)
    .where(eq(predictionSnapshots.actual_had_flow, true))
    .union(
      db
        .select()
        .from(predictionSnapshots)
        .where(eq(predictionSnapshots.actual_had_flow, false)),
    );

  const totalChecked = allCheckedPredictions.length;

  if (totalChecked === 0) {
    return { totalChecked: 0, totalCorrect: 0, accuracyPercentage: 0 };
  }

  const totalCorrect = allCheckedPredictions.filter(
    (pred) => pred.actual_had_flow === true,
  ).length;

  const accuracyPercentage = Math.round((totalCorrect / totalChecked) * 100);

  return { totalChecked, totalCorrect, accuracyPercentage };
};

/**
 * Get recent prediction history (last 10 checked predictions)
 */
export const getRecentPredictionHistory = async () => {
  const recentPredictions = await db
    .select()
    .from(predictionSnapshots)
    .where(eq(predictionSnapshots.actual_had_flow, true))
    .union(
      db
        .select()
        .from(predictionSnapshots)
        .where(eq(predictionSnapshots.actual_had_flow, false)),
    )
    .limit(10)
    .orderBy(desc(predictionSnapshots.checked_date));

  return recentPredictions;
};

/**
 * Clear all old predictions (for cleanup/testing)
 */
export const deleteAllPredictionSnapshots = async () => {
  await db.delete(predictionSnapshots);
};

/**
 * Delete predictions older than a certain date
 */
export const deleteOldPredictions = async (beforeDate: string) => {
  await db
    .delete(predictionSnapshots)
    .where(eq(predictionSnapshots.prediction_made_date, beforeDate));
};

/**
 * TEST UTILITY: Generate sample prediction data for testing
 * This creates realistic prediction history with varying accuracy
 */
export const generateTestPredictionData = async (
  accuracyLevel: "high" | "medium" | "low" = "high",
) => {
  const today = new Date();
  const testData = [];

  // Determine how many predictions to make correct based on accuracy level
  let correctCount = 0;
  const totalPredictions = 20;

  switch (accuracyLevel) {
    case "high":
      correctCount = 17; // 85% accuracy
      break;
    case "medium":
      correctCount = 13; // 65% accuracy
      break;
    case "low":
      correctCount = 7; // 35% accuracy
      break;
  }

  // Generate 20 past predictions (10-30 days ago)
  for (let i = 0; i < totalPredictions; i++) {
    const daysAgo = 10 + i;
    const predictionDate = new Date(today);
    predictionDate.setDate(predictionDate.getDate() - daysAgo);
    const predictionDateStr = predictionDate.toISOString().split("T")[0];

    const predictedDate = new Date(today);
    predictedDate.setDate(predictedDate.getDate() - (daysAgo - 5));
    const predictedDateStr = predictedDate.toISOString().split("T")[0];

    // Determine if this prediction should be correct
    const isCorrect = i < correctCount;

    testData.push({
      prediction_made_date: predictionDateStr,
      predicted_date: predictedDateStr,
      confidence: 70 + Math.floor(Math.random() * 20), // 70-90% confidence
      actual_had_flow: isCorrect,
      checked_date: predictedDateStr,
    });
  }

  // Insert all test data
  await db.insert(predictionSnapshots).values(testData);

  console.log(
    `Generated ${totalPredictions} test predictions with ${accuracyLevel} accuracy (${correctCount}/${totalPredictions} correct)`,
  );
};
