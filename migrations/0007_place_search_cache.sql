CREATE TABLE place_search_cache (
  cache_key TEXT PRIMARY KEY,
  response_json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_place_search_cache_expires_at
  ON place_search_cache (expires_at);
