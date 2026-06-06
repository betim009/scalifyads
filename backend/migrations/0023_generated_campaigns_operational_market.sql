ALTER TABLE generated_campaigns
ADD COLUMN IF NOT EXISTS market_code text,
ADD COLUMN IF NOT EXISTS market_name text,
ADD COLUMN IF NOT EXISTS market_param text,
ADD COLUMN IF NOT EXISTS resolved_countries jsonb,
ADD COLUMN IF NOT EXISTS targeting_preview jsonb;

CREATE INDEX IF NOT EXISTS generated_campaigns_market_code_idx
  ON generated_campaigns (market_code);
