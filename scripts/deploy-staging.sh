#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — STAGING ENVIRONMENT DEPLOYMENT SCRIPT
# Deploys Kustomize staging overlay, runs database migration job, and verifies health.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
NAMESPACE="lostlink-staging"

echo "====================================================================="
echo "   LostLink 2.0 — Deploying to Staging Environment                  "
echo "   Namespace: ${NAMESPACE}                                          "
echo "====================================================================="

echo "[1/4] Ensuring staging namespace exists..."
kubectl get namespace "${NAMESPACE}" &>/dev/null || kubectl create namespace "${NAMESPACE}"

echo "[2/4] Applying Staging Kustomize overlay..."
kubectl apply -k "${ROOT_DIR}/k8s/overlays/staging"

echo "[3/4] Waiting for migration job to complete..."
if kubectl get job lostlink-db-migrate -n "${NAMESPACE}" &>/dev/null; then
  kubectl wait --for=condition=complete job/lostlink-db-migrate -n "${NAMESPACE}" --timeout=90s || true
fi

echo "[4/4] Waiting for deployments to roll out..."
kubectl rollout status deployment/lostlink-web -n "${NAMESPACE}" --timeout=120s
kubectl rollout status deployment/lostlink-worker -n "${NAMESPACE}" --timeout=120s

echo "====================================================================="
echo "   [SUCCESS] Staging deployment is healthy and ready!               "
echo "====================================================================="
kubectl get pods -n "${NAMESPACE}"

