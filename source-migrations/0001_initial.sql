CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY, code TEXT NOT NULL COLLATE NOCASE UNIQUE, name TEXT NOT NULL,
  size TEXT NOT NULL, material TEXT NOT NULL, lot TEXT NOT NULL, notes TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY, part_id TEXT NOT NULL REFERENCES parts(id), code_snapshot TEXT NOT NULL,
  name_snapshot TEXT NOT NULL, lot TEXT NOT NULL, inspector TEXT NOT NULL, notes TEXT NOT NULL,
  original_file TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
  created_at TEXT NOT NULL, review TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT NOT NULL DEFAULT '', reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY, inspection_id TEXT NOT NULL REFERENCES inspections(id),
  status TEXT NOT NULL, model_name TEXT, model_sha TEXT, config TEXT NOT NULL DEFAULT '{}',
  detections TEXT NOT NULL DEFAULT '[]', annotated_file TEXT, error TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, inspection_id TEXT NOT NULL REFERENCES inspections(id),
  decision TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stored_files (
  id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes INTEGER NOT NULL, chunks INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS file_chunks (
  file_id TEXT NOT NULL, idx INTEGER NOT NULL, bytes INTEGER NOT NULL, content TEXT NOT NULL,
  PRIMARY KEY(file_id, idx)
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS model_uploads (id TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS inspections_part ON inspections(part_id, created_at);
CREATE INDEX IF NOT EXISTS runs_inspection ON runs(inspection_id, created_at);
