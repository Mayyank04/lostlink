#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — DOCKER COMPOSE TEARDOWN SCRIPT
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
YELLOW="\033[33m"
RESET="\033[0m"

echo -e "${BOLD}${YELLOW}==> Tearing down LostLink 2.0 Compose containers and networks...${RESET}"
docker compose down

echo -e "${BOLD}==> Tear down complete.${RESET}"

