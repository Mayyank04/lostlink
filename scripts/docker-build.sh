#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — DOCKER IMAGES BUILD SCRIPT (TARGET: linux/amd64)
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RESET="\033[0m"

# Default to linux/amd64 for Vultr Cloud Compute / x86_64 VPS nodes
TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"
REGISTRY="${DOCKER_REGISTRY:-}" # e.g. ghcr.io/username or docker.io/username
# Pinned version tag for reproducible production deployments (avoids 'latest')
TAG="${IMAGE_TAG:-v2.0.0}"

WEB_IMAGE="lostlink-web:${TAG}"
WORKER_IMAGE="lostlink-worker:${TAG}"

if [[ -n "${REGISTRY}" ]]; then
  WEB_IMAGE="${REGISTRY}/lostlink-web:${TAG}"
  WORKER_IMAGE="${REGISTRY}/lostlink-worker:${TAG}"
fi

echo -e "${BOLD}${BLUE}=====================================================================${RESET}"
echo -e "${BOLD}${BLUE}   LostLink 2.0 — Docker Production Container Builder                ${RESET}"
echo -e "   Target Architecture: ${YELLOW}${TARGET_PLATFORM}${RESET}"
echo -e "   Web Target:          ${GREEN}${WEB_IMAGE}${RESET}"
echo -e "   Worker Target:       ${GREEN}${WORKER_IMAGE}${RESET}"
echo -e "${BOLD}${BLUE}=====================================================================${RESET}"

echo -e "\n${BOLD}${BLUE}[1/2] Building Next.js Web Application Container (${TARGET_PLATFORM})...${RESET}"
docker buildx build \
  --platform "${TARGET_PLATFORM}" \
  -t "${WEB_IMAGE}" \
  -f docker/Dockerfile.web \
  --load \
  .

echo -e "\n${BOLD}${BLUE}[2/2] Building Matching & Outbox Worker Container (${TARGET_PLATFORM})...${RESET}"
docker buildx build \
  --platform "${TARGET_PLATFORM}" \
  -t "${WORKER_IMAGE}" \
  -f docker/Dockerfile.worker \
  --load \
  .

echo -e "\n${BOLD}${GREEN}==> Successfully built all production containers for ${TARGET_PLATFORM}!${RESET}"
docker images | grep -E "lostlink-web|lostlink-worker" || true


