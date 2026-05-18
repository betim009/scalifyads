CREATE TABLE IF NOT EXISTS creative_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  creative_asset_id uuid REFERENCES creative_assets(id) ON DELETE SET NULL,
  primary_text text,
  headline text,
  description text,
  cta_type text,
  destination_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creative_templates_created_at_idx
  ON creative_templates (created_at DESC);

