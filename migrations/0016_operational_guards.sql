CREATE TABLE request_rate_limits (
  scope TEXT NOT NULL,
  bucket_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (scope, bucket_start)
);

CREATE INDEX idx_request_rate_limits_expiry ON request_rate_limits (expires_at);

CREATE TABLE operation_locks (
  name TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  locked_until INTEGER NOT NULL
);
