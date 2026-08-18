-- Data migration, then schema. Every device that ran the old savePredictions
-- has accumulated duplicate rows for the same (prediction_made_date,
-- predicted_date), so CREATE UNIQUE INDEX fails unless they are cleared first.
-- Newest row per key wins: it carries the most recent confidence, and
-- checkPredictionAccuracy updates every row for a predicted date together, so
-- duplicates within one key always share their outcome.
DELETE FROM `prediction_snapshots` WHERE `id` NOT IN (
  SELECT MAX(`id`) FROM `prediction_snapshots`
  GROUP BY `prediction_made_date`, `predicted_date`
);--> statement-breakpoint
CREATE UNIQUE INDEX `prediction_snapshots_generation_unique` ON `prediction_snapshots` (`prediction_made_date`,`predicted_date`);