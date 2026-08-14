ALTER TABLE anonymous_feedback ADD COLUMN submission_key TEXT NOT NULL DEFAULT '';
ALTER TABLE anonymous_feedback ADD COLUMN screen TEXT NOT NULL DEFAULT '';
ALTER TABLE anonymous_feedback ADD COLUMN locale TEXT NOT NULL DEFAULT 'ko';

CREATE UNIQUE INDEX idx_anonymous_feedback_submission_key
  ON anonymous_feedback (submission_key) WHERE submission_key <> '';

CREATE TABLE anonymous_usage_counts (
  usage_date TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'XX',
  locale TEXT NOT NULL DEFAULT 'ko',
  surface TEXT NOT NULL DEFAULT 'service',
  session_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (usage_date, country_code, locale, surface)
);

CREATE INDEX idx_anonymous_usage_date
  ON anonymous_usage_counts (usage_date, country_code, locale);
