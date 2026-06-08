ALTER TABLE generated_adsets
ADD COLUMN IF NOT EXISTS configured_status text;

ALTER TABLE generated_ads
ADD COLUMN IF NOT EXISTS configured_status text;

ALTER TABLE creative_drafts
ADD COLUMN IF NOT EXISTS meta_status text;
