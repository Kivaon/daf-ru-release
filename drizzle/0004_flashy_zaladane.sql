CREATE TABLE `translation_map_sources` (
	`tractate` text NOT NULL,
	`page` text NOT NULL,
	`requirements_json` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `translation_map_sources_page` ON `translation_map_sources` (`tractate`,`page`);