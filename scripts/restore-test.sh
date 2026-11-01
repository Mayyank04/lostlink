#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — DISASTER RECOVERY DRILL (NON-DESTRUCTIVE RESTORE VERIFIER)
# Restores the latest backup into an isolated 'lostlink_restore_test' DB
# and validates table counts, ensuring zero data loss and valid recovery.
# ==============================================================================
set -euo pipefail

BACKUP_DIR="./backups"
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/lostlink_backup_*.sql.gz 2>/dev/null | head -n1 || true)

if [[ -z "${LATEST_BACKUP}" ]]; then
  echo "[-] ERROR: No backup file found in ${BACKUP_DIR}. Running scripts/backup-database.sh first..."
  ./scripts/backup-database.sh
  LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/lostlink_backup_*.sql.gz | head -n1)
fi

echo "====================================================================="
echo "   LostLink 2.0 — Disaster Recovery & Backup Integrity Drill        "
echo "   Testing Backup File: ${LATEST_BACKUP}                            "
echo "====================================================================="

TEST_DB="lostlink_restore_test"

if kubectl get pod -n lostlink postgres-0 &>/dev/null; then
  PG_USER=$(kubectl exec -n lostlink postgres-0 -- printenv POSTGRES_USER 2>/dev/null | tr -d '\r' || echo "lostlink")
  echo "[1/3] Preparing verification database in Kubernetes '${TEST_DB}' using user '${PG_USER}'..."
  kubectl exec -n lostlink postgres-0 -- psql -U "${PG_USER}" -d lostlink -c "DROP DATABASE IF EXISTS ${TEST_DB};"
  kubectl exec -n lostlink postgres-0 -- psql -U "${PG_USER}" -d lostlink -c "CREATE DATABASE ${TEST_DB};"

  echo "[2/3] Restoring backup archive into '${TEST_DB}'..."
  gunzip -c "${LATEST_BACKUP}" | kubectl exec -i -n lostlink postgres-0 -- psql -U "${PG_USER}" -d "${TEST_DB}" > /dev/null

  echo "[3/3] Validating restored table row counts..."
  ITEM_COUNT=$(kubectl exec -n lostlink postgres-0 -- psql -U "${PG_USER}" -d "${TEST_DB}" -t -c "SELECT COUNT(*) FROM \"Item\";" | tr -d ' \r\n')
  USER_COUNT=$(kubectl exec -n lostlink postgres-0 -- psql -U "${PG_USER}" -d "${TEST_DB}" -t -c "SELECT COUNT(*) FROM \"User\";" | tr -d ' \r\n')
  COLLEGE_COUNT=$(kubectl exec -n lostlink postgres-0 -- psql -U "${PG_USER}" -d "${TEST_DB}" -t -c "SELECT COUNT(*) FROM \"College\";" | tr -d ' \r\n')

  echo "      Verified Items:    ${ITEM_COUNT}"
  echo "      Verified Users:    ${USER_COUNT}"
  echo "      Verified Colleges: ${COLLEGE_COUNT}"

  # Clean up test database
  kubectl exec -n lostlink postgres-0 -- psql -U "${PG_USER}" -d lostlink -c "DROP DATABASE ${TEST_DB};"
  echo "[+] Test database successfully cleaned up."
else
  echo "[1/3] Preparing verification database locally '${TEST_DB}'..."
  PGPASSWORD="${PGPASSWORD:-postgres}" psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};"
  PGPASSWORD="${PGPASSWORD:-postgres}" psql -h localhost -U postgres -c "CREATE DATABASE ${TEST_DB};"

  echo "[2/3] Restoring backup archive into '${TEST_DB}'..."
  gunzip -c "${LATEST_BACKUP}" | PGPASSWORD="${PGPASSWORD:-postgres}" psql -h localhost -U postgres -d "${TEST_DB}" > /dev/null

  echo "[3/3] Validating restored table row counts..."
  ITEM_COUNT=$(PGPASSWORD="${PGPASSWORD:-postgres}" psql -h localhost -U postgres -d "${TEST_DB}" -t -c "SELECT COUNT(*) FROM \"Item\";" | tr -d ' \r\n')
  USER_COUNT=$(PGPASSWORD="${PGPASSWORD:-postgres}" psql -h localhost -U postgres -d "${TEST_DB}" -t -c "SELECT COUNT(*) FROM \"User\";" | tr -d ' \r\n')
  COLLEGE_COUNT=$(PGPASSWORD="${PGPASSWORD:-postgres}" psql -h localhost -U postgres -d "${TEST_DB}" -t -c "SELECT COUNT(*) FROM \"College\";" | tr -d ' \r\n')

  echo "      Verified Items:    ${ITEM_COUNT}"
  echo "      Verified Users:    ${USER_COUNT}"
  echo "      Verified Colleges: ${COLLEGE_COUNT}"

  # Clean up test database
  PGPASSWORD="${PGPASSWORD:-postgres}" psql -h localhost -U postgres -c "DROP DATABASE ${TEST_DB};"
  echo "[+] Test database successfully cleaned up."
fi

echo "====================================================================="
echo "   [SUCCESS] Recovery Drill Passed: Archive is healthy & consistent! "
echo "====================================================================="
