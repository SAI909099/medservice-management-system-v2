#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/medservice}"
BACKUP_DIR="${BACKUP_DIR:-/opt/medservice-data/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

mkdir -p "${BACKUP_DIR}"
TIMESTAMP="$(date +%F_%H-%M-%S)"
OUT_FILE="${BACKUP_DIR}/medservice_${TIMESTAMP}.sql.gz"

cd "${PROJECT_DIR}"

if [[ -f "${PROJECT_DIR}/backend/.env.prod" ]]; then
  # shellcheck disable=SC1091
  source "${PROJECT_DIR}/backend/.env.prod"
fi

docker compose -f "${COMPOSE_FILE}" exec -T db \
  pg_dump -U "${POSTGRES_USER:-medservice}" "${POSTGRES_DB:-medservice}" \
  | gzip > "${OUT_FILE}"

find "${BACKUP_DIR}" -type f -name "medservice_*.sql.gz" -mtime +"${KEEP_DAYS}" -delete

echo "Backup created: ${OUT_FILE}"
