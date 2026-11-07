#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — VULTR CLOUD COMPUTE K3S SERVER BOOTSTRAP
# Target: Ubuntu 24.04 / 22.04 LTS on Vultr Cloud Compute
# Provisions: UFW Firewall, Fail2ban, K3s (with Traefik & Local Storage), cert-manager
# ==============================================================================
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}[-] Error: This bootstrap script must be run as root.${RESET}" >&2
  exit 1
fi

DOMAIN="${1:-}"
if [[ -z "${DOMAIN}" ]]; then
  echo -e "${YELLOW}Usage: bash vultr-k3s-bootstrap.sh <your-domain.com>${RESET}"
  echo -e "${YELLOW}Example: bash vultr-k3s-bootstrap.sh lostlink.mycollege.edu${RESET}\n"
  read -rp "Enter your fully-qualified domain name (FQDN): " DOMAIN
fi

PUBLIC_IP=$(curl -s4 https://ifconfig.me || curl -s4 https://icanhazip.com || echo "127.0.0.1")

echo -e "${BOLD}${BLUE}=====================================================================${RESET}"
echo -e "${BOLD}${BLUE}   LostLink 2.0 — Vultr Cloud Compute K3s Bootstrap                  ${RESET}"
echo -e "   Target Domain: ${GREEN}${DOMAIN}${RESET}"
echo -e "   Public IP:     ${GREEN}${PUBLIC_IP}${RESET}"
echo -e "${BOLD}${BLUE}=====================================================================${RESET}"

echo -e "\n${BLUE}[1/5] Updating system packages & installing required tools...${RESET}"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  curl \
  wget \
  git \
  ufw \
  fail2ban \
  ca-certificates \
  htop \
  jq \
  tar \
  gzip \
  unzip \
  socat \
  conntrack \
  iptables

echo -e "\n${BLUE}[2/5] Configuring UFW Firewall & Network Perimeter...${RESET}"
ufw default deny incoming
ufw default allow outgoing

# Allow SSH, HTTP, and HTTPS
ufw limit 22/tcp comment 'SSH with rate limiting'
ufw allow 80/tcp comment 'HTTP (ACME Challenge & redirect)'
ufw allow 443/tcp comment 'HTTPS (Next.js Application & API)'

# Ensure internal services are never exposed directly to the public internet
ufw deny 5432/tcp comment 'Block public access to internal PostgreSQL'
ufw deny 6443/tcp comment 'Block public access to Kubernetes API'

ufw --force enable
ufw status verbose

echo -e "\n${BLUE}[3/5] Installing K3s (Lightweight Kubernetes with Traefik)...${RESET}"
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server \
  --tls-san ${PUBLIC_IP} \
  --tls-san ${DOMAIN} \
  --write-kubeconfig-mode 600" sh -

echo "[*] Waiting for K3s node to be Ready..."
until kubectl get node &>/dev/null; do
  sleep 2
done
kubectl wait --for=condition=Ready node --all --timeout=60s
echo -e "${GREEN}[+] K3s node is Ready!${RESET}"

echo -e "\n${BLUE}[4/5] Installing cert-manager for automated Let's Encrypt TLS...${RESET}"
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.17.0/cert-manager.yaml

echo "[*] Waiting for cert-manager deployments..."
kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=120s
kubectl wait --for=condition=Available deployment/cert-manager-webhook -n cert-manager --timeout=120s
kubectl wait --for=condition=Available deployment/cert-manager-cainjector -n cert-manager --timeout=120s
echo -e "${GREEN}[+] cert-manager is running!${RESET}"

echo -e "\n${BLUE}[5/5] Configuring Let's Encrypt Production ClusterIssuer...${RESET}"
cat << EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@${DOMAIN}
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: traefik
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@${DOMAIN}
    privateKeySecretRef:
      name: letsencrypt-staging-account-key
    solvers:
      - http01:
          ingress:
            class: traefik
EOF
echo -e "${GREEN}[+] Let's Encrypt ClusterIssuers created!${RESET}"

echo -e "\n${BOLD}${GREEN}=====================================================================${RESET}"
echo -e "${BOLD}${GREEN}   [SUCCESS] Vultr VPS Node is fully initialized!                    ${RESET}"
echo -e "   Next steps:"
echo -e "   1. Point DNS A-record for '${DOMAIN}' to ${PUBLIC_IP}"
echo -e "   2. Copy k8s/overlays/vultr/secret.example.yaml to k8s/overlays/vultr/secret.yaml and set credentials"
echo -e "   3. Update domain in k8s/overlays/vultr/configmap-patch.yaml & ingress-patch.yaml"
echo -e "   4. Deploy from the repository root: bash scripts/deploy-vultr.sh"
echo -e "${BOLD}${GREEN}=====================================================================${RESET}"

