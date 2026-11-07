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
APP_DOMAIN="lostlink-demo.duckdns.org"

echo -e "${BOLD}${BLUE}=====================================================================${RESET}"
echo -e "${BOLD}${BLUE}   LostLink 2.0 — Vultr K3s Production Rollout                      ${RESET}"
echo -e "${BOLD}${BLUE}   Target Domain: https://${APP_DOMAIN}                             ${RESET}"
echo -e "${BOLD}${BLUE}=====================================================================${RESET}"

# 1. Preflight checks
echo -e "\n${BLUE}[1/6] Checking Kubernetes cluster connectivity...${RESET}"
if ! kubectl cluster-info &>/dev/null; then
  echo -e "${RED}[-] Error: Cannot connect to Kubernetes cluster via kubectl.${RESET}" >&2
  exit 1
fi
echo -e "${GREEN}[+] Cluster reachable. Node status:${RESET}"
kubectl get nodes

# 2. Check secret.yaml existence & safety
echo -e "\n${BLUE}[2/6] Verifying Kubernetes production credentials...${RESET}"
if [[ ! -f "${OVERLAY_DIR}/secret.yaml" ]]; then
  if kubectl get secret lostlink-secrets -n "${NAMESPACE}" &>/dev/null; then
    echo -e "${GREEN}[+] Found existing 'lostlink-secrets' in namespace '${NAMESPACE}'. Preserving current cluster secrets.${RESET}"
  else
    echo -e "${YELLOW}[!] Warning: ${OVERLAY_DIR}/secret.yaml not found and no existing secret in cluster.${RESET}"
    echo -e "${YELLOW}    Copying secret.example.yaml to secret.yaml. PLEASE UPDATE WITH REAL SECRETS!${RESET}"
    cp "${OVERLAY_DIR}/secret.example.yaml" "${OVERLAY_DIR}/secret.yaml"
    kubectl apply -f "${OVERLAY_DIR}/secret.yaml"
  fi
else
  echo -e "${GREEN}[+] Applying secrets from ${OVERLAY_DIR}/secret.yaml...${RESET}"
  kubectl apply -f "${OVERLAY_DIR}/secret.yaml"
fi

# 3. Handle Kubernetes Job Immutability
echo -e "\n${BLUE}[3/6] Preparing database migration job (handling Job immutability)...${RESET}"
if kubectl get job lostlink-db-migrate -n "${NAMESPACE}" &>/dev/null; then
  echo -e "${YELLOW}[*] Removing previous migration Job to prevent immutability conflict...${RESET}"
  kubectl delete job lostlink-db-migrate -n "${NAMESPACE}" --wait=true
  echo -e "${GREEN}[+] Prior migration Job pruned cleanly.${RESET}"
fi

# 4. Apply Vultr Kustomize Overlay
echo -e "\n${BLUE}[4/6] Applying Vultr Kustomize overlay manifests...${RESET}"
kubectl apply -k "${OVERLAY_DIR}"

# 5. Wait for database migration job to succeed before updating dependent services
echo -e "\n${BLUE}[5/6] Waiting for database schema migrations to complete successfully...${RESET}"
if kubectl get job lostlink-db-migrate -n "${NAMESPACE}" &>/dev/null; then
  if ! kubectl wait --for=condition=complete job/lostlink-db-migrate -n "${NAMESPACE}" --timeout=120s; then
    echo -e "${RED}[-] Migration job timed out or failed! Extracting diagnostics:${RESET}"
    echo -e "${YELLOW}--- Migration Pod Status ---${RESET}"
    kubectl get pods -n "${NAMESPACE}" -l app=lostlink-db-migrate -o wide || true
    echo -e "${YELLOW}--- Init Container (wait-for-postgres) Logs ---${RESET}"
    kubectl logs -n "${NAMESPACE}" job/lostlink-db-migrate -c wait-for-postgres --tail=50 || true
    echo -e "${YELLOW}--- Prisma Migration Container Logs ---${RESET}"
    kubectl logs -n "${NAMESPACE}" job/lostlink-db-migrate -c prisma-migrate --tail=50 || true
    exit 1
  fi
  echo -e "${GREEN}[+] Database schema migrations completed successfully!${RESET}"
fi

# 6. Monitor zero-downtime rolling update of Web & Worker deployments
echo -e "\n${BLUE}[6/6] Monitoring zero-downtime rolling update...${RESET}"
# Trigger a rolling restart to ensure pods pick up any updated migration schema / config
kubectl rollout restart deployment/lostlink-web deployment/lostlink-worker -n "${NAMESPACE}"

if ! kubectl rollout status deployment/lostlink-web -n "${NAMESPACE}" --timeout=180s; then
  echo -e "${RED}[-] Web deployment rollout failed! Pod diagnostics:${RESET}"
  kubectl get pods -n "${NAMESPACE}" -l app=lostlink-web
  kubectl describe pods -n "${NAMESPACE}" -l app=lostlink-web | grep -A 10 "Events:" || true
  kubectl logs -n "${NAMESPACE}" -l app=lostlink-web -c wait-for-db --tail=30 || true
  kubectl logs -n "${NAMESPACE}" -l app=lostlink-web -c web --tail=50 || true
  echo -e "${YELLOW}[*] Rolling back web deployment...${RESET}"
  kubectl rollout undo deployment/lostlink-web -n "${NAMESPACE}"
  exit 1
fi
echo -e "${GREEN}[+] Web deployment is Ready!${RESET}"

if ! kubectl rollout status deployment/lostlink-worker -n "${NAMESPACE}" --timeout=120s; then
  echo -e "${RED}[-] Worker deployment rollout failed! Pod diagnostics:${RESET}"
  kubectl get pods -n "${NAMESPACE}" -l app=lostlink-worker
  kubectl logs -n "${NAMESPACE}" -l app=lostlink-worker -c wait-for-db --tail=30 || true
  kubectl logs -n "${NAMESPACE}" -l app=lostlink-worker -c worker --tail=50 || true
  kubectl rollout undo deployment/lostlink-worker -n "${NAMESPACE}"
  exit 1
fi
echo -e "${GREEN}[+] Worker deployment is Ready!${RESET}"

# Automated Health Checks & Smoke Verification
echo -e "\n${BLUE}[*] Running health endpoint verification...${RESET}"
WEB_POD=$(kubectl get pod -n "${NAMESPACE}" -l app=lostlink-web -o jsonpath='{.items[0].metadata.name}')

echo -e "Executing in-pod readiness check via ${WEB_POD}..."
SMOKE_RES=$(kubectl exec -n "${NAMESPACE}" "${WEB_POD}" -c web -- curl -s http://localhost:3000/api/health/ready || echo '{"status":"failed"}')

if echo "${SMOKE_RES}" | grep -q '"status":"ready"'; then
  echo -e "${GREEN}[+] In-cluster readiness probe passed! Response:${RESET}"
  echo "${SMOKE_RES}" | jq . 2>/dev/null || echo "${SMOKE_RES}"
else
  echo -e "${RED}[-] In-cluster readiness test failed. Response: ${SMOKE_RES}${RESET}" >&2
  exit 1
fi

echo -e "\nExecuting public HTTPS ingress readiness check (https://${APP_DOMAIN}/api/health/ready)..."
PUBLIC_RES=$(curl -ks "https://${APP_DOMAIN}/api/health/ready" || echo '{"status":"failed"}')
if echo "${PUBLIC_RES}" | grep -q '"status":"ready"'; then
  echo -e "${GREEN}[+] Public HTTPS health probe passed! Response:${RESET}"
  echo "${PUBLIC_RES}" | jq . 2>/dev/null || echo "${PUBLIC_RES}"
else
  echo -e "${YELLOW}[!] Note: Public HTTPS check returned non-ready (${PUBLIC_RES}), verify external DNS/cert propagation.${RESET}"
fi

echo -e "\n${BOLD}${GREEN}=====================================================================${RESET}"
echo -e "${BOLD}${GREEN}   [SUCCESS] LostLink 2.0 deployed and healthy on Vultr K3s!         ${RESET}"
echo -e "${BOLD}${GREEN}=====================================================================${RESET}"
kubectl get pods,services,ingress,jobs -n "${NAMESPACE}"
