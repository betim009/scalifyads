CREATE TABLE IF NOT EXISTS user_operational_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language_key text NOT NULL,
  label text NOT NULL,
  target_language text,
  is_core boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, language_key)
);

CREATE INDEX IF NOT EXISTS idx_user_operational_languages_user_active
  ON user_operational_languages (user_id, active);
