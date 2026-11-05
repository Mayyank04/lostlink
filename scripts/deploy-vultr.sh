#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — VULTR PRODUCTION KUBERNETES DEPLOYMENT SCRIPT
# Executes zero-downtime rolling update on Vultr K3s
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

NAMESPACE="lostlink"
OVERLAY_DIR="k8s/overlays/vultr"

echo -e "${BOLD}${BLUE}=====================================================================${RESET}"
echo -e "${BOLD}${BLUE}   LostLink 2.0 — Vultr K3s Production Rollout                      ${RESET}"
echo -e "${BOLD}${BLUE}=====================================================================${RESET}"

# 1. Preflight checks
echo -e "\n${BLUE}[1/5] Checking Kubernetes cluster connectivity...${RESET}"
if ! kubectl cluster-info &>/dev/null; then
  echo -e "${RED}[-] Error: Cannot connect to Kubernetes cluster via kubectl.${RESET}" >&2
  exit 1
fi
echo -e "${GREEN}[+] Cluster reachable. Node status:${RESET}"
kubectl get nodes

# 2. Check secret.yaml existence
if [[ ! -f "${OVERLAY_DIR}/secret.yaml" ]]; then
  if kubectl get secret lostlink-secrets -n "${NAMESPACE}" &>/dev/null; then
    echo -e "${GREEN}[+] Found existing 'lostlink-secrets' in namespace '${NAMESPACE}'. Proceeding.${RESET}"
  else
    echo -e "${YELLOW}[!] Warning: ${OVERLAY_DIR}/secret.yaml not found.${RESET}"
    echo -e "${YELLOW}    Copying secret.example.yaml to secret.yaml. PLEASE UPDATE WITH REAL SECRETS!${RESET}"
    cp "${OVERLAY_DIR}/secret.example.yaml" "${OVERLAY_DIR}/secret.yaml"
    kubectl apply -f "${OVERLAY_DIR}/secret.yaml"
  fi
else
  echo -e "${GREEN}[+] Applying secrets from ${OVERLAY_DIR}/secret.yaml...${RESET}"
  kubectl apply -f "${OVERLAY_DIR}/secret.yaml"
fi

# 3. Apply Vultr Kustomize Overlay
echo -e "\n${BLUE}[2/5] Applying Vultr Kustomize overlay manifests...${RESET}"
kubectl apply -k "${OVERLAY_DIR}"

# 4. Wait for database migration job to succeed
echo -e "\n${BLUE}[3/5] Waiting for database schema migrations to complete...${RESET}"
if kubectl get job lostlink-db-migrate -n "${NAMESPACE}" &>/dev/null; then
  kubectl wait --for=condition=complete job/lostlink-db-migrate -n "${NAMESPACE}" --timeout=90s || {
    echo -e "${RED}[-] Migration job timed out or failed! Checking logs:${RESET}"
    kubectl logs -n "${NAMESPACE}" job/lostlink-db-migrate --tail=50
    exit 1
  }
  echo -e "${GREEN}[+] Database schema synchronized via Prisma!${RESET}"
fi

# 5. Wait for Web and Worker rolling deployments
echo -e "\n${BLUE}[4/5] Monitoring zero-downtime rolling update...${RESET}"
if ! kubectl rollout status deployment/lostlink-web -n "${NAMESPACE}" --timeout=180s; then
  echo -e "${RED}[-] Web deployment rollout failed! Rolling back to previous revision...${RESET}"
  kubectl rollout undo deployment/lostlink-web -n "${NAMESPACE}"
  exit 1
fi

kubectl rollout status deployment/lostlink-worker -n "${NAMESPACE}" --timeout=120s
echo -e "${GREEN}[+] Workloads successfully rolled out!${RESET}"

# 6. Automated Smoke Test
echo -e "\n${BLUE}[5/5] Executing automated smoke verification test...${RESET}"
WEB_POD=$(kubectl get pod -n "${NAMESPACE}" -l app=lostlink-web -o jsonpath='{.items[0].metadata.name}')

SMOKE_RES=$(kubectl exec -n "${NAMESPACE}" "${WEB_POD}" -- curl -s http://localhost:3000/api/health/ready || echo "FAIL")
if echo "${SMOKE_RES}" | grep -q '"status":"ready"'; then
  echo -e "${GREEN}[+] Smoke test passed! Health status:${RESET}"
  echo "${SMOKE_RES}" | jq . || echo "${SMOKE_RES}"
else
  echo -e "${RED}[-] Smoke test failed. Response: ${SMOKE_RES}${RESET}" >&2
  exit 1
fi

echo -e "\n${BOLD}${GREEN}=====================================================================${RESET}"
echo -e "${BOLD}${GREEN}   [SUCCESS] LostLink 2.0 deployed and healthy on Vultr K3s!         ${RESET}"
echo -e "${BOLD}${GREEN}=====================================================================${RESET}"
kubectl get pods,services,ingress -n "${NAMESPACE}"
