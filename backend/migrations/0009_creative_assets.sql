CREATE TABLE IF NOT EXISTS creative_assets (
  id uuid PRIMARY KEY,
  stored_name text NOT NULL UNIQUE,
  original_name text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creative_assets_created_at_idx
  ON creative_assets (created_at DESC);

