CREATE TABLE anonymous_event_counts (
  event_date TEXT NOT NULL,
  event_name TEXT NOT NULL,
  campaign_source TEXT NOT NULL DEFAULT '',
  campaign_medium TEXT NOT NULL DEFAULT '',
  campaign_name TEXT NOT NULL DEFAULT '',
  event_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (event_date, event_name, campaign_source, campaign_medium, campaign_name)
);

CREATE INDEX idx_anonymous_event_counts_date
  ON anonymous_event_counts (event_date, event_name);
