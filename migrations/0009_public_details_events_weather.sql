ALTER TABLE public_places ADD COLUMN overview TEXT NOT NULL DEFAULT '';
ALTER TABLE public_places ADD COLUMN opening_hours TEXT NOT NULL DEFAULT '';
ALTER TABLE public_places ADD COLUMN rest_date TEXT NOT NULL DEFAULT '';
ALTER TABLE public_places ADD COLUMN fee_info TEXT NOT NULL DEFAULT '';
ALTER TABLE public_places ADD COLUMN detail_synced_at INTEGER;

CREATE TABLE public_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  venue_name TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  opening_hours TEXT NOT NULL DEFAULT '',
  fee_info TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  synced_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(provider, source_id)
);

CREATE INDEX idx_public_events_dates ON public_events (start_date, end_date, active);
CREATE INDEX idx_public_events_venue ON public_events (venue_name, active);

CREATE TABLE weather_forecasts (
  forecast_at TEXT PRIMARY KEY,
  forecast_date TEXT NOT NULL,
  forecast_time TEXT NOT NULL,
  temperature REAL,
  rain_probability INTEGER,
  precipitation_type INTEGER,
  sky INTEGER,
  wind_speed REAL,
  fetched_at INTEGER NOT NULL
);

CREATE INDEX idx_weather_forecasts_date ON weather_forecasts (forecast_date);
