PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`flow_intensity` integer,
	`is_cycle_start` integer DEFAULT false,
	`is_cycle_end` integer DEFAULT false,
	`notes` text
);
--> statement-breakpoint
INSERT INTO `__new_days`("id", "date", "flow_intensity", "is_cycle_start", "is_cycle_end", "notes") SELECT "id", "date", "flow_intensity", "is_cycle_start", "is_cycle_end", "notes" FROM `days`;--> statement-breakpoint
DROP TABLE `days`;--> statement-breakpoint
ALTER TABLE `__new_days` RENAME TO `days`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `days_date_unique` ON `days` (`date`);--> statement-breakpoint
CREATE TABLE `__new_medications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`dose` text,
	`visible` integer DEFAULT true,
	`type` text,
	`description` text
);
--> statement-breakpoint
INSERT INTO `__new_medications`("id", "name", "dose", "visible", "type", "description") SELECT "id", "name", "dose", "visible", "type", "description" FROM `medications`;--> statement-breakpoint
DROP TABLE `medications`;--> statement-breakpoint
ALTER TABLE `__new_medications` RENAME TO `medications`;--> statement-breakpoint
CREATE TABLE `__new_moods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`visible` integer DEFAULT true,
	`description` text
);
--> statement-breakpoint
INSERT INTO `__new_moods`("id", "name", "visible", "description") SELECT "id", "name", "visible", "description" FROM `moods`;--> statement-breakpoint
DROP TABLE `moods`;--> statement-breakpoint
ALTER TABLE `__new_moods` RENAME TO `moods`;--> statement-breakpoint
CREATE UNIQUE INDEX `moods_name_unique` ON `moods` (`name`);--> statement-breakpoint
CREATE TABLE `__new_symptoms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`visible` integer DEFAULT true,
	`description` text
);
--> statement-breakpoint
INSERT INTO `__new_symptoms`("id", "name", "visible", "description") SELECT "id", "name", "visible", "description" FROM `symptoms`;--> statement-breakpoint
DROP TABLE `symptoms`;--> statement-breakpoint
ALTER TABLE `__new_symptoms` RENAME TO `symptoms`;--> statement-breakpoint
CREATE UNIQUE INDEX `symptoms_name_unique` ON `symptoms` (`name`);