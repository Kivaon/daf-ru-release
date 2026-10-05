CREATE TABLE `mail_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`tractate` text NOT NULL,
	`refs_json` text NOT NULL,
	`before_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`next_at` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease` text,
	`message_id` text,
	`error` text,
	`created_at` text NOT NULL
);
