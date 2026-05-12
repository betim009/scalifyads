CREATE TABLE IF NOT EXISTS ops_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  entity text,
  action text,
  ok boolean NOT NULL DEFAULT true,
  error text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_at text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_logs_created_at_idx ON ops_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ops_logs_source_idx ON ops_logs (source);
CREATE INDEX IF NOT EXISTS ops_logs_source_entity_idx ON ops_logs (source, entity);
