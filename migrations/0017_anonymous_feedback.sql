CREATE TABLE anonymous_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_date TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('helpful', 'not_helpful')),
  reason TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  surface TEXT NOT NULL DEFAULT 'service',
  client_kind TEXT NOT NULL DEFAULT 'web',
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_anonymous_feedback_date
  ON anonymous_feedback (feedback_date, sentiment);
