-- P29: Multiple Meta accounts per user (credentials stay backend-only)

CREATE TABLE IF NOT EXISTS user_meta_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  meta_ad_account_id text,
  meta_page_id text,
  meta_access_token text,
  meta_instagram_actor_id text,
  business_label text,
  country_hint text,
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_meta_accounts_user_id_created_at
  ON user_meta_accounts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_meta_accounts_user_id_is_default
  ON user_meta_accounts (user_id, is_default DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_meta_accounts_default_per_user
  ON user_meta_accounts (user_id)
  WHERE is_default = true;

ALTER TABLE generated_campaigns
  ADD COLUMN IF NOT EXISTS meta_account_id uuid REFERENCES user_meta_accounts(id) ON DELETE SET NULL;

-- One-time migration: if user already has legacy meta fields, create a default Meta Account.
INSERT INTO user_meta_accounts (
  user_id,
  name,
  meta_ad_account_id,
  meta_page_id,
  meta_access_token,
  is_default,
  is_active
)
SELECT
  u.id,
  'Conta principal',
  u.meta_ad_account_id,
  u.meta_page_id,
  t.access_token,
  true,
  true
FROM users u
LEFT JOIN LATERAL (
  SELECT access_token
  FROM meta_tokens mt
  WHERE mt.user_id = u.id
  ORDER BY mt.created_at DESC
  LIMIT 1
) t ON true
WHERE
  (u.meta_ad_account_id IS NOT NULL OR u.meta_page_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM user_meta_accounts uma WHERE uma.user_id = u.id
  );

