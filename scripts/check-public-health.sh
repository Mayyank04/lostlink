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
LIVE_CODE=$(curl -s -o /tmp/ll_live_body.json -w "%{http_code}" "${BASE_URL}/api/health/live" || echo "000")
LIVE_BODY=$(cat /tmp/ll_live_body.json 2>/dev/null || echo "FAILED")

if [[ "${LIVE_CODE}" == "200" ]]; then
  echo "OK (200)"
  echo "      ${LIVE_BODY}"
else
  echo "FAIL (${LIVE_CODE})"
fi

echo -n "[2/3] Probing Readiness Probe (/api/health/ready)... "
READY_CODE=$(curl -s -o /tmp/ll_ready_body.json -w "%{http_code}" "${BASE_URL}/api/health/ready" || echo "000")
READY_BODY=$(cat /tmp/ll_ready_body.json 2>/dev/null || echo "FAILED")

if [[ "${READY_CODE}" == "200" ]]; then
  echo "OK (200)"
  echo "      ${READY_BODY}"
else
  echo "FAIL (${READY_CODE})"
fi

echo -n "[3/3] Probing Hybrid Worker Status API (/api/hybrid/status)... "
HYBRID_CODE=$(curl -s -o /tmp/ll_hybrid_body.json -w "%{http_code}" "${BASE_URL}/api/hybrid/status" || echo "000")
HYBRID_BODY=$(cat /tmp/ll_hybrid_body.json 2>/dev/null || echo "FAILED")

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

