ALTER TABLE generated_ads
ADD COLUMN IF NOT EXISTS creative_draft_id uuid REFERENCES creative_drafts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS generated_ads_creative_draft_id_idx
  ON generated_ads (creative_draft_id);

