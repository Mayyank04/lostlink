#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — KUBERNETES CLUSTER & WORKLOAD STATUS AUDIT
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
RESET="\033[0m"

NAMESPACE="lostlink"

echo -e "${BOLD}${BLUE}=== [1] KUBERNETES NODES ===${RESET}"
kubectl get nodes -o wide

echo -e "\n${BOLD}${BLUE}=== [2] WORKLOAD PODS (Namespace: ${NAMESPACE}) ===${RESET}"
kubectl get pods -n "${NAMESPACE}" -o wide

echo -e "\n${BOLD}${BLUE}=== [3] SERVICES & ENDPOINTS ===${RESET}"
kubectl get svc -n "${NAMESPACE}" -o wide

echo -e "\n${BOLD}${BLUE}=== [4] INGRESS ROUTES ===${RESET}"
kubectl get ingress -n "${NAMESPACE}"

echo -e "\n${BOLD}${BLUE}=== [5] HORIZONTAL POD AUTOSCALER ===${RESET}"
kubectl get hpa -n "${NAMESPACE}"

echo -e "\n${BOLD}${BLUE}=== [6] REAL-TIME METRICS (METRICS-SERVER) ===${RESET}"
kubectl top nodes || true
echo ""
kubectl top pods -n "${NAMESPACE}" || true

echo -e "\n${BOLD}${GREEN}=== STATUS CHECK COMPLETE ===${RESET}"
