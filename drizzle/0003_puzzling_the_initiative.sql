CREATE TABLE `pregnancy_appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`type` text,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `pregnancy_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`kicks` integer,
	`symptoms` text,
	`moods` text,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pregnancy_days_date_unique` ON `pregnancy_days` (`date`);