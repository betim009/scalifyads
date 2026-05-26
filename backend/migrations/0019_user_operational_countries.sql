-- P23: Per-user operational countries (used by /campaign-flow batch selection)

CREATE TABLE IF NOT EXISTS user_operational_countries (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, country_code)
);

CREATE INDEX IF NOT EXISTS user_operational_countries_user_id_created_at_idx
  ON user_operational_countries (user_id, created_at DESC);

