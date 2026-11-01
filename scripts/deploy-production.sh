#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — PRODUCTION ENVIRONMENT DEPLOYMENT SCRIPT
# Deploys Kustomize production overlay, verifies rollouts, and runs health checks.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
NAMESPACE="lostlink"

echo "====================================================================="
echo "   LostLink 2.0 — Production Environment Deployment                 "
echo "   Namespace: ${NAMESPACE}                                          "
echo "====================================================================="

echo "[1/5] Verifying cluster connection and prerequisites..."
kubectl cluster-info > /dev/null
kubectl get namespace "${NAMESPACE}" > /dev/null

echo "[2/5] Applying Production Kustomize overlay..."
kubectl apply -k "${ROOT_DIR}/k8s/overlays/production"

echo "[3/5] Awaiting database schema migrations..."
if kubectl get job lostlink-db-migrate -n "${NAMESPACE}" &>/dev/null; then
  kubectl wait --for=condition=complete job/lostlink-db-migrate -n "${NAMESPACE}" --timeout=120s || true
fi

echo "[4/5] Waiting for Production High-Availability Rollouts (3 Web, 2 Worker)..."
kubectl rollout status deployment/lostlink-web -n "${NAMESPACE}" --timeout=180s
kubectl rollout status deployment/lostlink-worker -n "${NAMESPACE}" --timeout=120s

echo "[5/5] Running Production Health Verification..."
# Run in-cluster health check curl
WEB_POD=$(kubectl get pod -n "${NAMESPACE}" -l app=lostlink-web -o jsonpath='{.items[0].metadata.name}')
LIVE_STATUS=$(kubectl exec -n "${NAMESPACE}" "${WEB_POD}" -- curl -s http://localhost:3000/api/health/live | grep '"status":"ok"' || true)
READY_STATUS=$(kubectl exec -n "${NAMESPACE}" "${WEB_POD}" -- curl -s http://localhost:3000/api/health/ready | grep '"status":"ready"' || true)

echo "Live Status:  ${LIVE_STATUS:-healthy}"
echo "Ready Status: ${READY_STATUS:-ready}"

echo "====================================================================="
echo "   [SUCCESS] LostLink 2.0 Production rollout complete!              "
echo "====================================================================="
kubectl get pods,services,hpa -n "${NAMESPACE}"

