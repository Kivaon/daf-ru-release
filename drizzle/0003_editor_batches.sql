CREATE TABLE `editor_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tractate` text NOT NULL,
	`page` text NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`write_token` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editor_batches_owner_page` ON `editor_batches` (`user_id`,`tractate`,`page`);