CREATE TABLE IF NOT EXISTS country_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  codes text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS country_templates_created_at_idx
  ON country_templates (created_at DESC);

