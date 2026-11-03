#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — FREE PUBLIC HOSTING & CLOUDFLARE TUNNEL DEPLOYMENT SCRIPT
# ==============================================================================
# Automates zero-cost public HTTPS ingress to the LostLink 2.0 Kubernetes / Docker platform.
# Exposes the local cluster (localhost:8080) or app server (localhost:3000) securely
# via Cloudflare's global edge network without open inbound firewall ports or static public IPs.
# ==============================================================================

set -euo pipefail

# ANSI color codes
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

TARGET_PORT="${1:-8080}"
TUNNEL_NAME="${TUNNEL_NAME:-lostlink-public}"

echo -e "${BOLD}${CYAN}================================================================${RESET}"
echo -e "${BOLD}${CYAN}      LOSTLINK 2.0 — FREE PUBLIC CLOUD INGRESS DEPLOYMENT       ${RESET}"
echo -e "${BOLD}${CYAN}================================================================${RESET}"
echo -e "Target Upstream Port: ${BOLD}${TARGET_PORT}${RESET} (K8s Ingress or Docker App)"

# 1. Verify upstream application responsiveness
echo -e "\n${BOLD}[1/4] Checking local service availability on port ${TARGET_PORT}...${RESET}"
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${TARGET_PORT}/api/health/ready" | grep -qE "200|404"; then
  echo -e "  ${GREEN}✓ Upstream service detected and responding on http://localhost:${TARGET_PORT}${RESET}"
else
  echo -e "  ${YELLOW}⚠ Warning: http://localhost:${TARGET_PORT} did not immediately respond.${RESET}"
  echo -e "  ${YELLOW}Ensure Kubernetes cluster ('npm run k8s:deploy') or Docker ('docker compose up') is active.${RESET}"
fi

# 2. Check for Cloudflare Tunnel tooling (native binary or Docker)
echo -e "\n${BOLD}[2/4] Detecting Cloudflare Tunnel runtime...${RESET}"
USE_DOCKER=false
if command -v cloudflared &> /dev/null; then
  CLOUDFLARED_VERSION=$(cloudflared --version | head -n 1)
  echo -e "  ${GREEN}✓ Found native cloudflared CLI: ${CLOUDFLARED_VERSION}${RESET}"
elif command -v docker &> /dev/null; then
  echo -e "  ${CYAN}ℹ cloudflared binary not found in PATH, using Docker container 'cloudflare/cloudflared'${RESET}"
  USE_DOCKER=true
else
  echo -e "  ${RED}✗ Error: Neither 'cloudflared' CLI nor 'docker' is installed.${RESET}"
  echo -e "  To install cloudflared on macOS: brew install cloudflared"
  echo -e "  To install on Linux (Debian/Ubuntu): sudo apt-get install -y cloudflared"
  exit 1
fi

# 3. Determine tunnel mode
echo -e "\n${BOLD}[3/4] Configuring Cloudflare Edge Ingress Mode...${RESET}"
if [ -n "${TUNNEL_TOKEN:-}" ]; then
  echo -e "  ${GREEN}✓ Production Named Tunnel Mode detected with provided TUNNEL_TOKEN.${RESET}"
  echo -e "  Running dedicated tunnel daemon..."

  if [ "$USE_DOCKER" = true ]; then
    docker run --rm -d \
      --name lostlink-tunnel \
      --network host \
      cloudflare/cloudflared:latest tunnel --no-autoupdate run --token "$TUNNEL_TOKEN"
    echo -e "  ${GREEN}✓ Tunnel container running in background (container ID: lostlink-tunnel).${RESET}"
  else
    cloudflared tunnel run --token "$TUNNEL_TOKEN"
  fi
else
  echo -e "  ${CYAN}ℹ No TUNNEL_TOKEN specified — initiating Free Quick TryCloudflare Pilot Tunnel.${RESET}"
  echo -e "  This creates an instant public HTTPS domain with full TLS termination at zero cost."
  echo -e "  ${YELLOW}Notice: Press Ctrl+C at any time to terminate the public tunnel.${RESET}\n"

  echo -e "${BOLD}[4/4] Launching Public Edge Tunnel to http://localhost:${TARGET_PORT}...${RESET}"
  if [ "$USE_DOCKER" = true ]; then
    docker run --rm -it \
      --network host \
      cloudflare/cloudflared:latest tunnel --url "http://localhost:${TARGET_PORT}"
  else
    cloudflared tunnel --url "http://localhost:${TARGET_PORT}"
  fi
fi
