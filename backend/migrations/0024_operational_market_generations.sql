CREATE TABLE IF NOT EXISTS operational_market_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  market_code text NOT NULL,
  market_name text,
  market_param text NOT NULL,
  resolved_countries jsonb NOT NULL DEFAULT '[]'::jsonb,
  targeting_preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  utm_campaign text,
  src text,
  status text NOT NULL DEFAULT 'PAUSED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS operational_market_generations_campaign_market_idx
  ON operational_market_generations (campaign_id, market_code);

CREATE INDEX IF NOT EXISTS operational_market_generations_market_code_idx
  ON operational_market_generations (market_code);

CREATE INDEX IF NOT EXISTS operational_market_generations_created_at_idx
  ON operational_market_generations (created_at DESC);
