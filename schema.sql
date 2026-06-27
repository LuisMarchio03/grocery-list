CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT DEFAULT '',
  is_checked INTEGER DEFAULT 0,
  is_promotion INTEGER DEFAULT 0,
  photo_base64 TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
