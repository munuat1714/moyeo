CREATE TABLE public_places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  telephone TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  official_tags TEXT NOT NULL DEFAULT '[]',
  source_modified_at TEXT,
  synced_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(provider, source_id)
);

CREATE INDEX idx_public_places_category_location
  ON public_places (category, latitude, longitude);
CREATE INDEX idx_public_places_location
  ON public_places (latitude, longitude);
CREATE INDEX idx_public_places_provider_active
  ON public_places (provider, active);

CREATE TABLE public_data_sync (
  provider TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  last_started_at INTEGER,
  last_completed_at INTEGER,
  item_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);
