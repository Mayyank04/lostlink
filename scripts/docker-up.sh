#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — DOCKER COMPOSE STARTUP SCRIPT
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}==> Launching LostLink 2.0 full-stack Compose environment...${RESET}"
docker compose up -d

echo -e "${BOLD}${BLUE}==> Waiting for PostgreSQL and Web containers to report healthy...${RESET}"
until [ "$(docker inspect --format='{{json .State.Health.Status}}' lostlink-postgres 2>/dev/null)" = '"healthy"' ]; do
  sleep 2
done

echo -e "${BOLD}${GREEN}==> Compose environment online!${RESET}"
docker compose ps
echo ""
echo -e "Web Application:    ${GREEN}http://localhost:3000${RESET}"
echo -e "Health Liveness:    ${GREEN}http://localhost:3000/api/health/live${RESET}"
echo -e "Health Readiness:   ${GREEN}http://localhost:3000/api/health/ready${RESET}"
echo -e "Worker Healthz:     ${GREEN}http://localhost:3001/healthz${RESET}"
echo -e "Mailpit Web UI:     ${GREEN}http://localhost:8025${RESET}"

