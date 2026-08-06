#!/usr/bin/env bash

set -Eeuo pipefail

backup_volume="multiatendimento_db_backups"
backup_image="postgres:17"
temporary_path="/db-backups/.multiatendimento-latest.sql.gz.tmp"
final_path="/db-backups/multiatendimento-latest.sql.gz"

postgres_container="$(docker ps -q --filter name=multiatendimento_postgres.1 | head -n 1)"
if [[ -z "${postgres_container}" ]]; then
  echo "PostgreSQL container not found" >&2
  exit 1
fi

docker run --rm -v "${backup_volume}:/db-backups" "${backup_image}" rm -f "${temporary_path}"

docker exec "${postgres_container}" pg_dump \
  -U postgres \
  -d multiatendimento_db \
  --no-owner \
  --no-privileges \
  | gzip -c \
  | docker run --rm -i -v "${backup_volume}:/db-backups" "${backup_image}" tee "${temporary_path}" >/dev/null

docker run --rm -v "${backup_volume}:/db-backups" "${backup_image}" \
  mv "${temporary_path}" "${final_path}"

backup_bytes="$(docker run --rm -v "${backup_volume}:/db-backups" "${backup_image}" stat -c %s "${final_path}")"
echo "SQL backup completed: ${backup_bytes} bytes"
