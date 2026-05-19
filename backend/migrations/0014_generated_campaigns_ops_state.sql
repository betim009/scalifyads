ALTER TABLE generated_campaigns
ADD COLUMN IF NOT EXISTS ops_state text NOT NULL DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS generated_campaigns_ops_state_idx
  ON generated_campaigns (ops_state);

