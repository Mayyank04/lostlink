#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — K3D LOCAL KUBERNETES CLUSTER INITIALIZATION SCRIPT
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RESET="\033[0m"

CLUSTER_NAME="lostlink-cluster"

if k3d cluster list | grep -q "${CLUSTER_NAME}"; then
  echo -e "${YELLOW}Cluster '${CLUSTER_NAME}' already exists.${RESET}"
else
  echo -e "${BOLD}${BLUE}==> Creating k3d cluster '${CLUSTER_NAME}' with 1 server, 1 agent, and Traefik loadbalancer...${RESET}"
  k3d cluster create "${CLUSTER_NAME}" \
    --servers 1 \
    --agents 1 \
    --port "8080:80@loadbalancer" \
    --port "8443:443@loadbalancer"
fi

echo -e "${BOLD}${BLUE}==> Cluster verification:${RESET}"
kubectl cluster-info
echo ""
kubectl get nodes -o wide
echo -e "${BOLD}${GREEN}==> Cluster '${CLUSTER_NAME}' is ready!${RESET}"

