#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — KUBERNETES ENVIRONMENT TEARDOWN SCRIPT
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
YELLOW="\033[33m"
RESET="\033[0m"

CLUSTER_NAME="lostlink-cluster"

echo -e "${BOLD}${YELLOW}==> Deleting k3d cluster '${CLUSTER_NAME}'...${RESET}"
k3d cluster delete "${CLUSTER_NAME}"

echo -e "${BOLD}==> Cluster '${CLUSTER_NAME}' deleted successfully.${RESET}"

