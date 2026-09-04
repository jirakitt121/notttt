CREATE TABLE `chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`active_request_id` text,
	`active_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_threads_owner_updated_idx` ON `chat_threads` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `chat_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`model` text NOT NULL,
	`created_at` text NOT NULL,
	`finished_at` text,
	`error` text,
	`truncated` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `chat_threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_turns_thread_created_idx` ON `chat_turns` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `chat_turns_owner_created_idx` ON `chat_turns` (`owner_id`,`created_at`);
