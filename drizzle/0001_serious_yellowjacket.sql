CREATE TABLE `prediction_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prediction_made_date` text NOT NULL,
	`predicted_date` text NOT NULL,
	`confidence` integer NOT NULL,
	`actual_had_flow` integer,
	`checked_date` text
);
