-- P19: Internal auth (simple) + per-user Meta settings

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS password_plain text,
  ADD COLUMN IF NOT EXISTS meta_ad_account_id text,
  ADD COLUMN IF NOT EXISTS meta_page_id text;

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_created_at
  ON user_sessions (user_id, created_at DESC);

