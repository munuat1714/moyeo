ALTER TABLE anonymous_event_counts ADD COLUMN session_count INTEGER NOT NULL DEFAULT 0;
UPDATE anonymous_event_counts SET session_count = event_count;
