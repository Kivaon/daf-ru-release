CREATE TABLE `user_mail_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`next_at` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease` text,
	`message_id` text,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `user_mail_jobs` (`id`,`user_id`,`email`,`name`,`kind`,`status`,`message_id`,`created_at`) SELECT 'welcome:'||`user_id`,`user_id`,`email`,`name`,'welcome','sent','backfill',strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM `users`;
