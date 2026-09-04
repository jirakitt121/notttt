-- Nut Inspect: EMPTY SQLite schema generated from web migrations.
-- Use only for a NEW local database, not as a production migration or backup.
-- No accounts, passwords, API keys, images, or inspection records are included.
PRAGMA foreign_keys=ON;
BEGIN TRANSACTION;

CREATE TABLE `admin_accounts` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`iterations` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`window_ends` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
, `must_change_password` integer DEFAULT 0 NOT NULL, `credential_version` integer DEFAULT 1 NOT NULL);

CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
, `credential_version` integer DEFAULT 1 NOT NULL);

CREATE TABLE `chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`active_request_id` text,
	`active_until` integer DEFAULT 0 NOT NULL
);

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

CREATE TABLE `demo_items` (
	`entity_id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`sample_id` text
);

CREATE TABLE file_chunks (
  file_id TEXT NOT NULL, idx INTEGER NOT NULL, bytes INTEGER NOT NULL, content TEXT NOT NULL,
  PRIMARY KEY(file_id, idx)
);

CREATE TABLE inspections (
  id TEXT PRIMARY KEY, part_id TEXT NOT NULL REFERENCES parts(id), code_snapshot TEXT NOT NULL,
  name_snapshot TEXT NOT NULL, lot TEXT NOT NULL, inspector TEXT NOT NULL, notes TEXT NOT NULL,
  original_file TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
  created_at TEXT NOT NULL, review TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT NOT NULL DEFAULT '', reviewed_at TEXT
);

CREATE TABLE model_uploads (id TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE parts (
  id TEXT PRIMARY KEY, code TEXT NOT NULL COLLATE NOCASE UNIQUE, name TEXT NOT NULL,
  size TEXT NOT NULL, material TEXT NOT NULL, lot TEXT NOT NULL, notes TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY, inspection_id TEXT NOT NULL REFERENCES inspections(id),
  decision TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY, inspection_id TEXT NOT NULL REFERENCES inspections(id),
  status TEXT NOT NULL, model_name TEXT, model_sha TEXT, config TEXT NOT NULL DEFAULT '{}',
  detections TEXT NOT NULL DEFAULT '[]', annotated_file TEXT, error TEXT, created_at TEXT NOT NULL
);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE stored_files (
  id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes INTEGER NOT NULL, chunks INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX `admin_sessions_owner_created_idx` ON `admin_sessions` (`owner_id`,`created_at`);

CREATE INDEX `chat_threads_owner_updated_idx` ON `chat_threads` (`owner_id`,`updated_at`);

CREATE INDEX `chat_turns_owner_created_idx` ON `chat_turns` (`owner_id`,`created_at`);

CREATE INDEX `chat_turns_thread_created_idx` ON `chat_turns` (`thread_id`,`created_at`);

CREATE INDEX inspections_part ON inspections(part_id, created_at);

CREATE INDEX runs_inspection ON runs(inspection_id, created_at);

COMMIT;
PRAGMA optimize;
