#!/usr/bin/env bash
# ==============================================================================
# LostLink 2.0 — k6 Automated Load Testing & Benchmark Runner
# ==============================================================================
set -euo pipefail

TARGET_URL="${1:-http://host.docker.internal:8080}"
OUTPUT_FILE="tests/performance/k6-results.txt"

echo "====================================================================="
echo "   LostLink 2.0 — Executing Grafana k6 Performance Benchmark        "
echo "   Target Endpoint: ${TARGET_URL}"
echo "====================================================================="

mkdir -p tests/performance

docker run --rm -i \
  --add-host=host.docker.internal:host-gateway \
  -e TARGET_URL="${TARGET_URL}" \
  grafana/k6 run - < tests/performance/k6-load-test.js | tee "${OUTPUT_FILE}"

echo "====================================================================="
echo "   [SUCCESS] Load test results captured to: ${OUTPUT_FILE}"
echo "====================================================================="
