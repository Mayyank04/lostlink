#!/usr/bin/env bash
# ==============================================================================
# LOSTLINK 2.0 — PUBLIC CLOUD VPS HARDENING & PROVISIONING SCRIPT
# Target OS: Ubuntu 24.04 LTS (Noble Numbat)
# Applicable Providers: Hetzner Cloud (CX22/CPX21), DigitalOcean, AWS Lightsail
# ==============================================================================
set -euo pipefail

# Security: Must be executed as root or with sudo
if [[ $EUID -ne 0 ]]; then
  echo "[-] ERROR: This script must be run as root or with sudo." >&2
  exit 1
fi

DEPLOY_USER="lostlink"
SSH_PORT="22"

echo "====================================================================="
echo "   LostLink 2.0 — Public Cloud VPS Provisioning & Hardening         "
echo "   Target OS: Ubuntu 24.04 LTS | Cloud Computing Module IV PBL     "
echo "====================================================================="

echo "[1/7] Updating system package repositories and applying security patches..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  curl \
  wget \
  git \
  ufw \
  fail2ban \
  ca-certificates \
  gnupg \
  lsb-release \
  htop \
  jq \
  tar \
  gzip \
  unzip \
  socat \
  conntrack \
  iptables

echo "[2/7] Creating unprivileged application deployment user: ${DEPLOY_USER}..."
if ! id "${DEPLOY_USER}" &>/dev/null; then
  useradd -m -s /bin/bash -G sudo "${DEPLOY_USER}"
  echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/${DEPLOY_USER}"
  chmod 0440 "/etc/sudoers.d/${DEPLOY_USER}"
  echo "[+] User ${DEPLOY_USER} created with passwordless sudo."
else
  echo "[*] User ${DEPLOY_USER} already exists."
fi

# Set up SSH directory for deploy user if authorized_keys exists in root
if [[ -f /root/.ssh/authorized_keys ]]; then
  mkdir -p "/home/${DEPLOY_USER}/.ssh"
  cp /root/.ssh/authorized_keys "/home/${DEPLOY_USER}/.ssh/"
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
  chmod 700 "/home/${DEPLOY_USER}/.ssh"
  chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  echo "[+] Copied authorized SSH keys to /home/${DEPLOY_USER}/.ssh/authorized_keys."
fi

echo "[3/7] Hardening SSH daemon configuration..."
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#*X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
systemctl restart sshd || systemctl restart ssh

echo "[4/7] Configuring UFW (Uncomplicated Firewall) with Zero-Trust Hybrid Boundary..."
ufw default deny incoming
ufw default allow outgoing

# Allow standard web traffic
ufw limit 22/tcp comment 'SSH with rate limiting'
ufw allow 80/tcp comment 'HTTP (Let'\''s Encrypt ACME & redirect)'
ufw allow 443/tcp comment 'HTTPS (Next.js Application & Hybrid Worker API)'

# Explicitly ensure internal database and control plane are NOT reachable publicly
ufw deny 5432/tcp comment 'Block public access to internal PostgreSQL'
ufw deny 6443/tcp comment 'Block public access to Kubernetes API (access via SSH/VPN)'

# Enable UFW non-interactively
ufw --force enable
ufw status verbose

echo "[5/7] Configuring Fail2ban for brute-force SSH defense..."
cat << 'EOF' > /etc/fail2ban/jail.local
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 4
EOF
systemctl restart fail2ban
systemctl enable fail2ban

echo "[6/7] Tuning kernel parameters for Kubernetes and network forwarding..."
cat << 'EOF' > /etc/sysctl.d/99-kubernetes-cri.conf
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
net.bridge.bridge-nf-call-ip6tables = 1
vm.swappiness                       = 0
fs.inotify.max_user_watches         = 524288
fs.inotify.max_user_instances       = 8192
EOF
sysctl --system > /dev/null

echo "[7/7] Verifying system readiness..."
echo "UFW Status:"
ufw status
echo ""
echo "====================================================================="
echo "   [SUCCESS] VPS Hardening complete!                                "
echo "   Next step: Run ./k3s-install.sh to install K3s and cert-manager. "
echo "====================================================================="
