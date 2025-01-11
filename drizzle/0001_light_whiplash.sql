CREATE TABLE `medication_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_id` integer NOT NULL,
	`medication_id` integer NOT NULL,
	`time_taken` text,
	`notes` text,
	FOREIGN KEY (`day_id`) REFERENCES `days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`dose` text,
	`visible` integer,
	`type` text,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `mood_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_id` integer NOT NULL,
	`mood_id` integer NOT NULL,
	`intensity` integer,
	`notes` text,
	FOREIGN KEY (`day_id`) REFERENCES `days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mood_id`) REFERENCES `moods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `moods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`visible` integer,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `moods_name_unique` ON `moods` (`name`);--> statement-breakpoint
CREATE TABLE `symptom_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_id` integer NOT NULL,
	`symptom_id` integer NOT NULL,
	`intensity` integer,
	`notes` text,
	FOREIGN KEY (`day_id`) REFERENCES `days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`symptom_id`) REFERENCES `symptoms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `symptoms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`visible` integer,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `symptoms_name_unique` ON `symptoms` (`name`);--> statement-breakpoint
ALTER TABLE `days` ADD `is_cycle_start` integer;--> statement-breakpoint
ALTER TABLE `days` ADD `is_cycle_end` integer;--> statement-breakpoint
ALTER TABLE `days` ADD `notes` text;--> statement-breakpoint
CREATE UNIQUE INDEX `days_date_unique` ON `days` (`date`);