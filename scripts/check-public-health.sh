#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — PUBLIC CLOUD HEALTH & API CHECKER
# Usage: ./scripts/check-public-health.sh [BASE_URL]
# Default BASE_URL: http://localhost:8080 (or http://localhost:3000)
# ==============================================================================
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"

echo "====================================================================="
echo "   LostLink 2.0 — Public Cloud Infrastructure Health Probe          "
echo "   Endpoint: ${BASE_URL}                                            "
echo "====================================================================="

echo -n "[1/3] Probing Liveness Probe (/api/health/live)... "
LIVE_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/health/live" || echo "FAILED\n000")
LIVE_CODE=$(echo "${LIVE_RESP}" | tail -n1)
LIVE_BODY=$(echo "${LIVE_RESP}" | head -n -1)

if [[ "${LIVE_CODE}" == "200" ]]; then
  echo "OK (200)"
  echo "      ${LIVE_BODY}"
else
  echo "FAIL (${LIVE_CODE})"
fi

echo -n "[2/3] Probing Readiness Probe (/api/health/ready)... "
READY_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/health/ready" || echo "FAILED\n000")
READY_CODE=$(echo "${READY_RESP}" | tail -n1)
READY_BODY=$(echo "${READY_RESP}" | head -n -1)

if [[ "${READY_CODE}" == "200" ]]; then
  echo "OK (200)"
  echo "      ${READY_BODY}"
else
  echo "FAIL (${READY_CODE})"
fi

echo -n "[3/3] Probing Hybrid Worker Status API (/api/hybrid/status)... "
HYBRID_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/hybrid/status" || echo "FAILED\n000")
HYBRID_CODE=$(echo "${HYBRID_RESP}" | tail -n1)
HYBRID_BODY=$(echo "${HYBRID_RESP}" | head -n -1)

if [[ "${HYBRID_CODE}" == "200" ]]; then
  echo "OK (200)"
  echo "      ${HYBRID_BODY}"
else
  echo "WARN/RESTRICTED (${HYBRID_CODE})"
fi

echo "====================================================================="
if [[ "${LIVE_CODE}" == "200" && "${READY_CODE}" == "200" ]]; then
  echo "   [SUCCESS] Public Cloud Endpoint is fully operational!           "
else
  echo "   [FAILURE] One or more probes failed. Check cluster logs.        "
fi
echo "====================================================================="
