#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

MIGRATIONS_DIR="${MIGRATIONS_DIR:-backend/migrations}"
MIGRATIONS_TABLE="${MIGRATIONS_TABLE:-_migrations}"

DB_USER="${DB_USER:-campaign_user}"
DB_NAME="${DB_NAME:-campaign_db}"

COMPOSE_FILE="${COMPOSE_FILE:-infra/docker-compose.prod.yml}"
COMPOSE_SERVICE_POSTGRES="${COMPOSE_SERVICE_POSTGRES:-postgres}"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-}"
DEFAULT_FALLBACK_CONTAINER="${DEFAULT_FALLBACK_CONTAINER:-scalifyads-postgres-1}"

if [[ -z "$POSTGRES_CONTAINER" ]]; then
  if [[ -f "$COMPOSE_FILE" ]]; then
    POSTGRES_CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps -q "$COMPOSE_SERVICE_POSTGRES" 2>/dev/null || true)"
  fi
fi
if [[ -z "$POSTGRES_CONTAINER" ]]; then
  POSTGRES_CONTAINER="$DEFAULT_FALLBACK_CONTAINER"
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "[migrate.sh] erro: diretório de migrations não encontrado: $MIGRATIONS_DIR" >&2
  exit 1
fi

if ! docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1; then
  echo "[migrate.sh] erro: container Postgres não encontrado: $POSTGRES_CONTAINER" >&2
  echo "[migrate.sh] dica: defina POSTGRES_CONTAINER=<nome_ou_id> ou ajuste COMPOSE_FILE/COMPOSE_SERVICE_POSTGRES" >&2
  exit 1
fi

psql_try() {
  local port="$1"
  shift
  docker exec -i "$POSTGRES_CONTAINER" psql -v ON_ERROR_STOP=1 -p "$port" -U "$DB_USER" -d "$DB_NAME" "$@"
}

detect_port() {
  if [[ -n "${DB_PORT:-}" ]]; then
    echo "$DB_PORT"
    return 0
  fi

  # Prod compose uses `postgres -p 5433`. Some stacks keep default 5432.
  if psql_try 5433 -c "SELECT 1" >/dev/null 2>&1; then
    echo 5433
    return 0
  fi
  if psql_try 5432 -c "SELECT 1" >/dev/null 2>&1; then
    echo 5432
    return 0
  fi

  return 1
}

DB_PORT_SELECTED="$(detect_port || true)"
if [[ -z "$DB_PORT_SELECTED" ]]; then
  echo "[migrate.sh] erro: não foi possível conectar no Postgres dentro do container (tente definir DB_PORT)" >&2
  exit 1
fi

psql_in_container() {
  psql_try "$DB_PORT_SELECTED" "$@"
}

sql_quote_literal() {
  # Escape single quotes for SQL string literal: ' -> ''
  local s="$1"
  s="${s//\'/\'\'}"
  printf "'%s'" "$s"
}

echo "[migrate.sh] usando container: $POSTGRES_CONTAINER"
echo "[migrate.sh] db: $DB_NAME user: $DB_USER"
echo "[migrate.sh] port: $DB_PORT_SELECTED"

psql_in_container -c "CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());" >/dev/null

shopt -s nullglob
mapfile -t files < <(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | xargs -n1 basename | sort)
if [[ "${#files[@]}" -eq 0 ]]; then
  echo "[migrate.sh] nenhuma migration .sql encontrada em $MIGRATIONS_DIR"
  exit 0
fi

for name in "${files[@]}"; do
  name_lit="$(sql_quote_literal "$name")"
  already="$(psql_in_container -tA -c "SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE name = ${name_lit} LIMIT 1;" || true)"
  if [[ "$already" == "1" ]]; then
    continue
  fi

  echo "[migrate.sh] applying $name"
  # Apply as-is. If a migration needs to be atomic, it should include its own BEGIN/COMMIT.
  psql_in_container < "$MIGRATIONS_DIR/$name" >/dev/null
  psql_in_container -c "INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (${name_lit});" >/dev/null
done

echo "[migrate.sh] done"
