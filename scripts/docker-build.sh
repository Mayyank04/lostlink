#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — DOCKER IMAGES BUILD SCRIPT
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}==> Building LostLink 2.0 Web Application Image...${RESET}"
docker build -t lostlink-web:latest -f docker/Dockerfile.web .

echo -e "${BOLD}${BLUE}==> Building LostLink 2.0 Background Worker Image...${RESET}"
docker build -t lostlink-worker:latest -f docker/Dockerfile.worker .

echo -e "${BOLD}${GREEN}==> Successfully built all Docker images!${RESET}"
docker images | grep -E "lostlink-web|lostlink-worker"

