CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_updated_at_idx ON events (updated_at);
