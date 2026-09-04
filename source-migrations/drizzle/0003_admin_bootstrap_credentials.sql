ALTER TABLE `admin_accounts` ADD `must_change_password` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_accounts` ADD `credential_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD `credential_version` integer DEFAULT 1 NOT NULL;