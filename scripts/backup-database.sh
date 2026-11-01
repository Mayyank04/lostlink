#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — DATABASE BACKUP SCRIPT
# Creates a compressed, timestamped pg_dump from Kubernetes or local container.
# ==============================================================================
set -euo pipefail

BACKUP_DIR="./backups"
mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/lostlink_backup_${TIMESTAMP}.sql.gz"

echo "====================================================================="
echo "   LostLink 2.0 — Production Database Backup Utility                "
echo "   Target File: ${BACKUP_FILE}                                      "
echo "====================================================================="

if kubectl get pod -n lostlink postgres-0 &>/dev/null; then
  echo "[+] Detected running Kubernetes PostgreSQL pod (postgres-0 in 'lostlink')..."
  PG_USER=$(kubectl exec -n lostlink postgres-0 -- printenv POSTGRES_USER 2>/dev/null | tr -d '\r' || echo "lostlink")
  kubectl exec -n lostlink postgres-0 -- pg_dump -U "${PG_USER}" lostlink | gzip -9 > "${BACKUP_FILE}"
elif docker ps --format '{{.Names}}' | grep -q "postgres"; then
  PG_CONTAINER=$(docker ps --format '{{.Names}}' | grep "postgres" | head -n1)
  echo "[+] Detected running Docker PostgreSQL container (${PG_CONTAINER})..."
  docker exec -t "${PG_CONTAINER}" pg_dump -U lostlink lostlink | gzip -9 > "${BACKUP_FILE}"
else
  echo "[+] Attempting pg_dump via local connection (localhost:5432)..."
  PGPASSWORD="${PGPASSWORD:-postgres}" pg_dump -h localhost -p 5432 -U postgres -d lostlink | gzip -9 > "${BACKUP_FILE}"
fi

BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo "[+] Backup successfully created!"
echo "    File: ${BACKUP_FILE}"
echo "    Size: ${BACKUP_SIZE}"
echo "====================================================================="
