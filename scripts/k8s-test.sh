#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — END-TO-END KUBERNETES SMOKE TEST SUITE
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
RED="\033[31m"
RESET="\033[0m"

NAMESPACE="lostlink"
BASE_URL="http://localhost:8080"

echo -e "${BOLD}${BLUE}==> [Test 1] Testing Web Liveness Probe (/api/health/live)...${RESET}"
LIVE_RESP=$(curl -s -f "${BASE_URL}/api/health/live")
echo "Response: ${LIVE_RESP}"
if echo "${LIVE_RESP}" | grep -q '"alive"'; then
  echo -e "${GREEN}✓ Web Liveness probe PASSED${RESET}\n"
else
  echo -e "${RED}✗ Web Liveness probe FAILED${RESET}\n"
  exit 1
fi

echo -e "${BOLD}${BLUE}==> [Test 2] Testing Database Readiness Probe (/api/health/ready)...${RESET}"
READY_RESP=$(curl -s -f "${BASE_URL}/api/health/ready")
echo "Response: ${READY_RESP}"
if echo "${READY_RESP}" | grep -q '"ready"'; then
  echo -e "${GREEN}✓ Database Readiness probe PASSED${RESET}\n"
else
  echo -e "${RED}✗ Database Readiness probe FAILED${RESET}\n"
  exit 1
fi

echo -e "${BOLD}${BLUE}==> [Test 3] Testing Virtual Host Ingress Header (Host: lostlink.local)...${RESET}"
VHOST_RESP=$(curl -s -f -H "Host: lostlink.local" "${BASE_URL}/api/health/ready")
echo "Response: ${VHOST_RESP}"
if echo "${VHOST_RESP}" | grep -q '"ready"'; then
  echo -e "${GREEN}✓ Virtual Host routing PASSED${RESET}\n"
else
  echo -e "${RED}✗ Virtual Host routing FAILED${RESET}\n"
  exit 1
fi

echo -e "${BOLD}${BLUE}==> [Test 4] Testing Frontend SSR Landing Page...${RESET}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}")
echo "HTTP Status Code: ${HTTP_STATUS}"
if [ "${HTTP_STATUS}" -eq 200 ]; then
  echo -e "${GREEN}✓ Frontend Server-Side Rendering PASSED (200 OK)${RESET}\n"
else
  echo -e "${RED}✗ Frontend returned unexpected HTTP status: ${HTTP_STATUS}${RESET}\n"
  exit 1
fi

echo -e "${BOLD}${BLUE}==> [Test 5] Querying PostgreSQL Database in Cluster...${RESET}"
DB_STATS=$(kubectl exec postgres-0 -n "${NAMESPACE}" -- psql -U lostlink -d lostlink -t -c \
  "SELECT 'Colleges: ' || count(*) FROM \"College\" UNION ALL SELECT 'Users: ' || count(*) FROM \"User\" UNION ALL SELECT 'Items: ' || count(*) FROM \"Item\";")
echo -e "${DB_STATS}"
echo -e "${GREEN}✓ Database state verified successfully!${RESET}\n"

echo -e "${BOLD}${GREEN}==> ALL KUBERNETES TESTS PASSED SUCCESSFULLY!${RESET}"
