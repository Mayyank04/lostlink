#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — DEPLOY CAMPUS EDGE MATCHING AGENT
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
NAMESPACE="lostlink-campus"

echo "====================================================================="
echo "   LostLink 2.0 — Deploying Campus Edge Matching Agent              "
echo "   Namespace: ${NAMESPACE}                                          "
echo "====================================================================="

echo "[1/3] Applying campus overlay..."
kubectl apply -k "${ROOT_DIR}/k8s/overlays/campus"

echo "[2/3] Waiting for campus worker pod rollout..."
kubectl rollout status deployment/lostlink-campus-worker -n "${NAMESPACE}" --timeout=90s

echo "[3/3] Inspecting campus worker status..."
kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name=lostlink-campus-worker -o wide

echo "====================================================================="
echo "   [SUCCESS] Campus Edge Worker is running!                         "
echo "====================================================================="
