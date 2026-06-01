#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "infra/docker-compose.prod.yml" ]]; then
  echo "[deploy] erro: infra/docker-compose.prod.yml não encontrado"
  exit 1
fi

echo "[deploy] build do frontend (produção)"
pushd frontend >/dev/null
npm ci
npm run build
popd >/dev/null

echo "[deploy] subir containers (produção)"
docker compose -f infra/docker-compose.prod.yml up -d --build

echo "[deploy] rodar migrations (produção)"
bash backend/scripts/migrate.sh

echo "[deploy] configurar nginx (novo server block)"
if [[ "$(id -u)" -ne 0 ]]; then
  echo "[deploy] aviso: para instalar config do nginx e ajustar UFW, rode como root"
else
  install -d -m 0755 /etc/nginx/sites-available /etc/nginx/sites-enabled
  install -m 0644 infra/nginx.conf /etc/nginx/sites-available/campaign-builder.conf
  ln -sf /etc/nginx/sites-available/campaign-builder.conf /etc/nginx/sites-enabled/campaign-builder.conf
  nginx -t
  systemctl reload nginx

  echo "[deploy] liberar porta 8081 no UFW"
  ufw allow 8081/tcp || true
fi

echo "[deploy] pronto"
