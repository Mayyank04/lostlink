#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — KUBERNETES DATABASE BACKUP SCRIPT
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
RESET="\033[0m"

NAMESPACE="lostlink"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/lostlink_k8s_backup_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

echo -e "${BOLD}${BLUE}==> Backing up PostgreSQL database from StatefulSet 'postgres-0'...${RESET}"
kubectl exec postgres-0 -n "${NAMESPACE}" -- pg_dump -U lostlink -d lostlink --clean --if-exists > "${BACKUP_FILE}"

FILE_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo -e "${BOLD}${GREEN}==> Backup completed successfully!${RESET}"
echo -e "Saved to:  ${GREEN}${BACKUP_FILE}${RESET} (${FILE_SIZE})"
