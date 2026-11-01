#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — KUBERNETES DATABASE RESTORE SCRIPT
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
RED="\033[31m"
RESET="\033[0m"

NAMESPACE="lostlink"

if [ -z "${1:-}" ]; then
  echo -e "${RED}Usage: $0 <path-to-sql-dump>${RESET}"
  echo "Example: $0 backups/lostlink_k8s_backup_20261101_213147.sql"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo -e "${RED}Error: Backup file '${BACKUP_FILE}' not found!${RESET}"
  exit 1
fi

echo -e "${BOLD}${BLUE}==> Restoring database to StatefulSet 'postgres-0' from ${BACKUP_FILE}...${RESET}"
kubectl exec -i postgres-0 -n "${NAMESPACE}" -- psql -U lostlink -d lostlink < "${BACKUP_FILE}" > /dev/null

echo -e "${BOLD}${GREEN}==> Database restored successfully!${RESET}"
echo -e "${BOLD}${BLUE}==> Verifying table counts after restoration:${RESET}"
kubectl exec postgres-0 -n "${NAMESPACE}" -- psql -U lostlink -d lostlink -t -c \
  "SELECT 'Colleges: ' || count(*) FROM \"College\" UNION ALL SELECT 'Users: ' || count(*) FROM \"User\" UNION ALL SELECT 'Items: ' || count(*) FROM \"Item\";"

