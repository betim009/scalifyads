-- P25: Add per-country primary language for each user

ALTER TABLE user_operational_countries
  ADD COLUMN IF NOT EXISTS primary_language text;

