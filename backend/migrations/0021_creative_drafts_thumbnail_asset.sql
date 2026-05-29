ALTER TABLE creative_drafts
  ADD COLUMN IF NOT EXISTS creative_thumbnail_asset_id uuid REFERENCES creative_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS creative_drafts_thumbnail_asset_id_idx
  ON creative_drafts (creative_thumbnail_asset_id);
