ALTER TABLE creative_drafts
ADD COLUMN IF NOT EXISTS variant_key text;

ALTER TABLE generated_ads
ADD COLUMN IF NOT EXISTS variant_key text;

UPDATE creative_drafts
SET variant_key = 'A'
WHERE variant_key IS NULL;

UPDATE generated_ads
SET variant_key = 'A'
WHERE variant_key IS NULL;

CREATE INDEX IF NOT EXISTS creative_drafts_generated_campaign_variant_idx
  ON creative_drafts (generated_campaign_id, variant_key)
  WHERE meta_creative_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS generated_ads_generated_campaign_variant_idx
  ON generated_ads (generated_campaign_id, variant_key)
  WHERE meta_ad_id IS NOT NULL;
