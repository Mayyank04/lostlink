#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — K3S & CERT-MANAGER INSTALLATION ON PUBLIC CLOUD VPS
# ==============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "[-] ERROR: This script must be run as root or with sudo." >&2
  exit 1
fi

DEPLOY_USER="lostlink"
PUBLIC_IP=$(curl -s4 ifconfig.me || curl -s4 icanhazip.com || echo "127.0.0.1")
PUBLIC_DOMAIN="${1:-lostlink.edu}"

echo "====================================================================="
echo "   LostLink 2.0 — K3s & cert-manager Production Installer           "
echo "   Public IP:     ${PUBLIC_IP}                                      "
echo "   Domain:        ${PUBLIC_DOMAIN}                                  "
echo "====================================================================="

echo "[1/4] Installing K3s lightweight Kubernetes..."
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server \
  --tls-san ${PUBLIC_IP} \
  --tls-san ${PUBLIC_DOMAIN} \
  --write-kubeconfig-mode 644 \
  --disable servicelb" sh -

echo "[*] Waiting for K3s node to become ready..."
until kubectl get node &>/dev/null; do
  sleep 2
done
kubectl wait --for=condition=Ready node --all --timeout=60s
echo "[+] K3s node is Ready."

echo "[2/4] Configuring kubeconfig access for deploy user '${DEPLOY_USER}'..."
mkdir -p "/home/${DEPLOY_USER}/.kube"
cp /etc/rancher/k3s/k3s.yaml "/home/${DEPLOY_USER}/.kube/config"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.kube"
chmod 600 "/home/${DEPLOY_USER}/.kube/config"

echo "[3/4] Installing cert-manager for automatic ACME Let's Encrypt TLS..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.17.0/cert-manager.yaml

echo "[*] Waiting for cert-manager pods to be ready..."
kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=120s
kubectl wait --for=condition=Available deployment/cert-manager-webhook -n cert-manager --timeout=120s
kubectl wait --for=condition=Available deployment/cert-manager-cainjector -n cert-manager --timeout=120s
echo "[+] cert-manager is fully operational."

echo "[4/4] Applying Let's Encrypt ClusterIssuer..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/cert-manager-issuer.yaml" ]]; then
  kubectl apply -f "${SCRIPT_DIR}/cert-manager-issuer.yaml"
  echo "[+] Let's Encrypt ClusterIssuer configured."
fi

echo "====================================================================="
echo "   [SUCCESS] K3s & cert-manager installed successfully!            "
echo "   Cluster Nodes:                                                   "
kubectl get nodes -o wide
echo "====================================================================="
