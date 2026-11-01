#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — CONCURRENT HTTP LOAD TESTING & AUTOSCALING BENCHMARK
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RESET="\033[0m"

TARGET_URL="${1:-http://localhost:8080/api/health/ready}"
REQUESTS="${2:-150}"
CONCURRENCY="${3:-15}"

echo -e "${BOLD}${BLUE}======================================================${RESET}"
echo -e "${BOLD}LostLink 2.0 — Load Test & HPA Scaling Benchmark${RESET}"
echo -e "Target URL:     ${GREEN}${TARGET_URL}${RESET}"
echo -e "Total Requests: ${GREEN}${REQUESTS}${RESET}"
echo -e "Concurrency:    ${GREEN}${CONCURRENCY}${RESET}"
echo -e "${BOLD}${BLUE}======================================================${RESET}"

echo -e "\n${BOLD}[1] Initial HPA and Pod Status:${RESET}"
kubectl get hpa -n lostlink
kubectl get pods -n lostlink -l app=lostlink-web

echo -e "\n${BOLD}${BLUE}==> Firing concurrent requests...${RESET}"
START_TIME=$(date +%s)

seq 1 "${REQUESTS}" | xargs -n 1 -P "${CONCURRENCY}" -I {} sh -c \
  "curl -s -o /dev/null -w '%{http_code} %{time_total}\n' '${TARGET_URL}'" > /tmp/lostlink_loadtest.log

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
[ "${DURATION}" -eq 0 ] && DURATION=1

SUCCESSFUL=$(grep -c "^200" /tmp/lostlink_loadtest.log || true)
FAILED=$(grep -v -c "^200" /tmp/lostlink_loadtest.log || true)
RPS=$((SUCCESSFUL / DURATION))

echo -e "\n${BOLD}${GREEN}================ LOAD TEST RESULTS ================${RESET}"
echo -e "Duration:             ${DURATION} seconds"
echo -e "Total Sent:           ${REQUESTS}"
echo -e "HTTP 200 OK:          ${GREEN}${SUCCESSFUL}${RESET}"
echo -e "Failed:               ${FAILED}"
echo -e "Throughput:           ${GREEN}${RPS} req/sec${RESET}"

echo -e "\n${BOLD}[2] Real-Time HPA Status After Load:${RESET}"
kubectl get hpa -n lostlink
echo ""
kubectl top pods -n lostlink -l app=lostlink-web || true

rm -f /tmp/lostlink_loadtest.log

