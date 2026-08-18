DELETE FROM `mood_entries` WHERE `mood_id` NOT IN (SELECT `id` FROM `moods`);--> statement-breakpoint
DELETE FROM `symptom_entries` WHERE `symptom_id` NOT IN (SELECT `id` FROM `symptoms`);--> statement-breakpoint
DELETE FROM `medication_entries` WHERE `medication_id` NOT IN (SELECT `id` FROM `medications`);
