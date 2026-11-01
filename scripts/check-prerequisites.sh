#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — HOST & CLOUD PREREQUISITES AUDIT
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${BOLD}LostLink 2.0 — Infrastructure Prerequisites Verification${RESET}"
echo "------------------------------------------------------------------"

# Check Architecture
ARCH=$(uname -m)
echo -e "CPU Architecture:  ${GREEN}${ARCH}${RESET}"

# Check Docker Engine
if command -v docker >/dev/null 2>&1; then
  DOCKER_VER=$(docker --version)
  echo -e "Docker Engine:     ${GREEN}${DOCKER_VER}${RESET}"
  if docker info >/dev/null 2>&1; then
    echo -e "Docker Daemon:     ${GREEN}Running${RESET}"
  else
    echo -e "Docker Daemon:     ${RED}NOT RUNNING. Please launch Docker Desktop.${RESET}"
    exit 1
  fi
else
  echo -e "Docker Engine:     ${RED}NOT FOUND. Please install Docker.${RESET}"
  exit 1
fi

# Check Docker Compose
if docker compose version >/dev/null 2>&1; then
  COMPOSE_VER=$(docker compose version)
  echo -e "Docker Compose:    ${GREEN}${COMPOSE_VER}${RESET}"
else
  echo -e "Docker Compose:    ${RED}NOT FOUND.${RESET}"
  exit 1
fi

# Check kubectl
if command -v kubectl >/dev/null 2>&1; then
  KUBECTL_VER=$(kubectl version --client -o yaml 2>/dev/null | grep gitVersion | head -n 1 | awk '{print $2}')
  echo -e "Kubernetes CLI:    ${GREEN}kubectl ${KUBECTL_VER}${RESET}"
else
  echo -e "Kubernetes CLI:    ${RED}kubectl NOT FOUND. Please install via: brew install kubernetes-cli${RESET}"
  exit 1
fi

# Check k3d
if command -v k3d >/dev/null 2>&1; then
  K3D_VER=$(k3d version | head -n 1)
  echo -e "k3d Distribution:  ${GREEN}${K3D_VER}${RESET}"
else
  echo -e "k3d Distribution:  ${RED}k3d NOT FOUND. Please install via: brew install k3d${RESET}"
  exit 1
fi

# Check Available Memory & Disk Space
FREE_DISK_GB=$(df -g . | awk 'NR==2 {print $4}')
echo -e "Available Disk:    ${GREEN}${FREE_DISK_GB} GB${RESET}"

if [ "${FREE_DISK_GB}" -lt 10 ]; then
  echo -e "${YELLOW}Warning: Less than 10GB free disk space remaining.${RESET}"
fi

echo "------------------------------------------------------------------"
echo -e "${GREEN}All local cloud infrastructure prerequisites satisfied!${RESET}"
