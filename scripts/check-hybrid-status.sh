#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — CHECK HYBRID STATUS WRAPPER
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."

cd "${ROOT_DIR}"
npx tsx scripts/check-hybrid-status.ts

