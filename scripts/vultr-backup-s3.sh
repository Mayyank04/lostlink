#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — VULTR CLOUD OFF-SERVER BACKUP & S3 ARCHIVAL SCRIPT
# Runs on Vultr VPS host (cron or manual execution)
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

NAMESPACE="lostlink"
LOCAL_BACKUP_DIR="/var/backups/lostlink"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="lostlink_db_${TIMESTAMP}.sql.gz"
LOCAL_BACKUP_FILE="${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}"

mkdir -p "${LOCAL_BACKUP_DIR}"

echo -e "${BOLD}${BLUE}=====================================================================${RESET}"
echo -e "${BOLD}${BLUE}   LostLink 2.0 — Vultr Off-Server Backup Automation                 ${RESET}"
echo -e "   Timestamp: ${TIMESTAMP}"
echo -e "${BOLD}${BLUE}=====================================================================${RESET}"

# 1. Verify kubectl access
if ! kubectl get pod postgres-0 -n "${NAMESPACE}" &>/dev/null; then
  echo -e "${RED}[-] Error: PostgreSQL pod postgres-0 is not running in namespace ${NAMESPACE}.${RESET}" >&2
  exit 1
fi

# 2. Extract database credentials from Kubernetes secret
DB_USER=$(kubectl get secret lostlink-secrets -n "${NAMESPACE}" -o jsonpath='{.data.POSTGRES_USER}' | base64 -d)
DB_NAME=$(kubectl get secret lostlink-secrets -n "${NAMESPACE}" -o jsonpath='{.data.POSTGRES_DB}' | base64 -d)

echo -e "\n${BLUE}[1/3] Dumping database from postgres-0 (${DB_NAME})...${RESET}"
kubectl exec postgres-0 -n "${NAMESPACE}" -- pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip -9 > "${LOCAL_BACKUP_FILE}"

FILE_SIZE=$(ls -lh "${LOCAL_BACKUP_FILE}" | awk '{print $5}')
echo -e "${GREEN}[+] Local backup created: ${LOCAL_BACKUP_FILE} (${FILE_SIZE})${RESET}"

# 3. Off-Server Upload to Vultr S3 Object Storage (if credentials present)
S3_ENDPOINT=$(kubectl get configmap lostlink-config -n "${NAMESPACE}" -o jsonpath='{.data.STORAGE_ENDPOINT}' 2>/dev/null || echo "")
S3_BUCKET=$(kubectl get configmap lostlink-config -n "${NAMESPACE}" -o jsonpath='{.data.STORAGE_BUCKET_NAME}' 2>/dev/null || echo "")

if [[ -n "${S3_BUCKET}" && -n "${S3_ENDPOINT}" ]] && command -v aws &>/dev/null; then
  echo -e "\n${BLUE}[2/3] Uploading backup to Vultr Object Storage (s3://${S3_BUCKET}/backups/)...${RESET}"
  
  S3_KEY=$(kubectl get secret lostlink-secrets -n "${NAMESPACE}" -o jsonpath='{.data.STORAGE_ACCESS_KEY_ID}' 2>/dev/null | base64 -d || echo "")
  S3_SECRET=$(kubectl get secret lostlink-secrets -n "${NAMESPACE}" -o jsonpath='{.data.STORAGE_SECRET_ACCESS_KEY}' 2>/dev/null | base64 -d || echo "")
  
  if [[ -n "${S3_KEY}" && -n "${S3_SECRET}" ]]; then
    AWS_ACCESS_KEY_ID="${S3_KEY}" \
    AWS_SECRET_ACCESS_KEY="${S3_SECRET}" \
    aws --endpoint-url="${S3_ENDPOINT}" s3 cp "${LOCAL_BACKUP_FILE}" "s3://${S3_BUCKET}/backups/${BACKUP_FILENAME}"
    echo -e "${GREEN}[+] Successfully archived backup to off-server Vultr Object Storage!${RESET}"
  else
    echo -e "${YELLOW}[!] Notice: S3 storage keys not found in secret. Skipped off-server upload.${RESET}"
  fi
else
  echo -e "\n${YELLOW}[!] Notice: aws cli not installed or S3 not configured. Retaining local backup.${RESET}"
fi

# 4. Prune local archives older than 7 days
echo -e "\n${BLUE}[3/3] Enforcing 7-day local retention policy...${RESET}"
find "${LOCAL_BACKUP_DIR}" -name "lostlink_db_*.sql.gz" -mtime +7 -exec rm -f {} \;
echo -e "${GREEN}[+] Local retention enforced.${RESET}"

echo -e "\n${BOLD}${GREEN}==> Backup workflow completed successfully!${RESET}"

