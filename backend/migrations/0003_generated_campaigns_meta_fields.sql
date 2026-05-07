ALTER TABLE generated_campaigns
ADD COLUMN IF NOT EXISTS meta_ad_account_id text,
ADD COLUMN IF NOT EXISTS meta_user_id text,
ADD COLUMN IF NOT EXISTS meta_status text,
ADD COLUMN IF NOT EXISTS meta_effective_status text,
ADD COLUMN IF NOT EXISTS meta_objective text;
