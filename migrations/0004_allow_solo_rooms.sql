PRAGMA foreign_keys = OFF;

CREATE TABLE rooms_solo_enabled (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  transport TEXT NOT NULL,
  stay TEXT NOT NULL DEFAULT '',
  expected_members INTEGER NOT NULL CHECK (expected_members BETWEEN 1 AND 6),
  vote_round INTEGER NOT NULL DEFAULT 1 CHECK (vote_round IN (1, 2)),
  runoff_course_ids TEXT NOT NULL DEFAULT '[]',
  final_course_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  recommendation_json TEXT,
  itinerary_json TEXT
);

INSERT INTO rooms_solo_enabled (
  id, name, origin, destination, start_date, end_date, transport, stay,
  expected_members, vote_round, runoff_course_ids, final_course_id,
  created_at, expires_at, recommendation_json, itinerary_json
) SELECT
  id, name, origin, destination, start_date, end_date, transport, stay,
  expected_members, vote_round, runoff_course_ids, final_course_id,
  created_at, expires_at, recommendation_json, itinerary_json
FROM rooms;
DROP TABLE rooms;
ALTER TABLE rooms_solo_enabled RENAME TO rooms;
CREATE INDEX rooms_expires_at_idx ON rooms(expires_at);

PRAGMA foreign_keys = ON;
