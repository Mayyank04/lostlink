#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — BUILD & IMPORT CONTAINER IMAGES INTO K3D
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
RESET="\033[0m"

CLUSTER_NAME="lostlink-cluster"

echo -e "${BOLD}${BLUE}==> Step 1: Building local Docker images...${RESET}"
docker build -t lostlink-web:latest -f docker/Dockerfile.web .
docker build -t lostlink-worker:latest -f docker/Dockerfile.worker .

echo -e "${BOLD}${BLUE}==> Step 2: Importing images into k3d cluster '${CLUSTER_NAME}'...${RESET}"
k3d image import lostlink-web:latest lostlink-worker:latest -c "${CLUSTER_NAME}"

echo -e "${BOLD}${GREEN}==> Images successfully imported into cluster!${RESET}"

