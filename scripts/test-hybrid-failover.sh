#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — HYBRID-CLOUD FAILOVER TEST SCRIPT
# Tests seamless failover from Campus Edge to Cloud Fallback with 0 duplicate executions
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."

cd "${ROOT_DIR}"

echo "====================================================================="
echo "   LostLink 2.0 — Hybrid Cloud Failover & Disaster Recovery Test    "
echo "   Cloud Computing Module IV PBL Project                            "
echo "====================================================================="

npx tsx scripts/run-hybrid-failover-test.ts

