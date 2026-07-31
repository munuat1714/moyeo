PRAGMA foreign_keys = ON;

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  transport TEXT NOT NULL,
  stay TEXT NOT NULL DEFAULT '',
  expected_members INTEGER NOT NULL CHECK (expected_members BETWEEN 2 AND 6),
  vote_round INTEGER NOT NULL DEFAULT 1 CHECK (vote_round IN (1, 2)),
  runoff_course_ids TEXT NOT NULL DEFAULT '[]',
  final_course_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_host INTEGER NOT NULL DEFAULT 0,
  token_hash TEXT NOT NULL UNIQUE,
  preference_json TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(room_id, name)
);

CREATE TABLE votes (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round IN (1, 2)),
  course_id TEXT NOT NULL CHECK (course_id IN ('balance', 'slow', 'active')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, member_id, round)
);

CREATE INDEX rooms_expires_at_idx ON rooms(expires_at);
CREATE INDEX members_room_id_idx ON members(room_id);
CREATE INDEX votes_room_round_idx ON votes(room_id, round);
