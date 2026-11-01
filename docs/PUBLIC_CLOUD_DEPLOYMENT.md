# LostLink 2.0 — Public Cloud Deployment Guide

## 1. Cloud Infrastructure Architecture

LostLink 2.0 uses a modern **Cloud-Native Single-Node / Multi-Node Kubernetes (K3s)** architecture hosted on a hardened Ubuntu 24.04 LTS Virtual Private Server (VPS). 

This design avoids the excessive overhead of managed hyperscaler Kubernetes (e.g. AWS EKS at \$73/mo base control plane fee) while providing full standard Kubernetes API compatibility, declarative Kustomize overlays, automated Let's Encrypt TLS certificates, and rolling updates.

```
+-------------------------------------------------------------------------+
|                  PUBLIC CLOUD VPS (Ubuntu 24.04 LTS)                    |
|                                                                         |
|  UFW Firewall: Deny All Inbound except 22/tcp (rate-limited), 80, 443   |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |             K3s Lightweight Kubernetes (v1.35.5+k3s1)             |  |
|  |                                                                   |  |
|  |  +-----------------------+     +-------------------------------+  |  |
|  |  | Traefik Ingress (80/443)    | cert-manager (ACME TLS HTTP-01)|  |  |
|  |  +-----------+-----------+     +---------------+---------------+  |  |
|  |              |                                 |                  |  |
|  |              v                                 v                  |  |
|  |  +-----------------------+     +-------------------------------+  |  |
|  |  | lostlink-web (3 pods) |     | lostlink-worker (2 pods)      |  |  |
|  |  | Next.js App Router    |     | Cloud Fallback Watchdog       |  |  |
|  |  +-----------+-----------+     +---------------+---------------+  |  |
|  |              |                                 |                  |  |
|  |              +----------------+----------------+                  |  |
|  |                               |                                   |  |
|  |                               v                                   |  |
|  |                 +----------------------------+                    |  |
|  |                 | StatefulSet: postgres-0    |                    |  |
|  |                 | Local Persistent Storage   |                    |  |
|  |                 +----------------------------+                    |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 2. Cloud VPS Provider & Sizing Matrix

| Provider | Instance Tier | vCPU | RAM | Storage | Bandwidth | Monthly Cost (USD) | Monthly Cost (INR @ 84.50) | Recommended Scope |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Hetzner Cloud** | CPX21 | 3 vCPU | 4 GB | 80 GB NVMe | 20 TB | **€7.05 (~$7.60)** | **₹642** | **Recommended for PBL & Pilot** |
| **DigitalOcean** | Basic Droplet | 2 vCPU | 4 GB | 80 GB SSD | 4 TB | **$24.00** | **₹2,028** | Good for US/EU campus regions |
| **AWS Lightsail** | Standard | 2 vCPU | 4 GB | 80 GB SSD | 4 TB | **$20.00** | **₹1,690** | Good for AWS ecosystem integration |
| **Hetzner Cloud** | CPX31 | 4 vCPU | 8 GB | 160 GB NVMe | 20 TB | **€13.40 (~$14.50)**| **₹1,225** | Production (10+ colleges) |

---

## 3. Step-by-Step VPS Provisioning & Hardening

### Step 1: Launch Ubuntu 24.04 LTS Instance
1. In your cloud console, create an instance with **Ubuntu 24.04 LTS (x64)**.
2. Add your public SSH key (`~/.ssh/id_ed25519.pub`).
3. Note the public IPv4 address (e.g. `203.0.113.50`).

### Step 2: Run Automated Hardening Script
SSH into the instance as `root`:
```bash
ssh root@203.0.113.50
```

Clone the repository and run the provisioning script:
```bash
git clone https://github.com/Mayyank04/lostlink.git /opt/lostlink-repo
cd /opt/lostlink-repo
chmod +x infrastructure/public-cloud/*.sh scripts/*.sh

# Run system hardening & firewall configuration
sudo ./infrastructure/public-cloud/vps-setup.sh
```

What `vps-setup.sh` configures automatically:
- Creates dedicated non-root user `lostlink` with sudo rights.
- Disables root SSH password login; enforces SSH key authentication.
- Configures `ufw` firewall:
  - **ALLOW**: Port 22 (SSH rate-limited), Port 80 (HTTP), Port 443 (HTTPS).
  - **DENY**: Port 5432 (Postgres), Port 6443 (Kubernetes API from public).
- Enables `fail2ban` for automated brute-force IP blocking.
- Tunes Linux kernel network forwarding parameters.

---

## 4. Install K3s Kubernetes & cert-manager

Run the automated K3s installer:
```bash
# Pass your custom domain or leave default
sudo ./infrastructure/public-cloud/k3s-install.sh lostlink.edu
```

This installs:
1. **K3s server**: Configured with TLS SANs for the public IP and domain.
2. **cert-manager v1.17.0**: Automated Let's Encrypt TLS certificate lifecycle controller.
3. **ClusterIssuer**: Configured for ACME HTTP-01 challenge validation via Traefik.

Verify cluster readiness:
```bash
kubectl get nodes -o wide
kubectl get pods -n cert-manager
```

---

## 5. DNS Configuration

Map your domain's DNS records to your VPS Public IP:

| Record Type | Host / Name | Target / Value | TTL | Note |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (or `lostlink.edu`) | `203.0.113.50` | 300 | Production root domain |
| **A** | `staging` | `203.0.113.50` | 300 | Staging environment |
| **CNAME** | `www` | `lostlink.edu` | 300 | Web redirect alias |

---

## 6. Deploy Production Workloads

Switch to the `lostlink` deploy user:
```bash
su - lostlink
cd /opt/lostlink-repo

# Run production deployment
./scripts/deploy-production.sh
```

This rolls out:
- Namespace `lostlink`
- Persistent PostgreSQL StatefulSet (`postgres-0`)
- Database migration Job (`lostlink-db-migrate`)
- 3 Replicas of `lostlink-web` with Horizontal Pod Autoscaler (HPA)
- 2 Replicas of `lostlink-worker` (Watchdog & cloud fallback)
- Ingress with automatic Let's Encrypt TLS (`lostlink-prod-tls`)

---

## 7. Verification & Health Monitoring

Verify live status:
```bash
./scripts/check-public-health.sh https://lostlink.edu
```

Expected output:
```
[1/3] Probing Liveness Probe (/api/health/live)... OK (200)
      {"status":"ok","timestamp":"2026-11-01T...","service":"lostlink-web"}
[2/3] Probing Readiness Probe (/api/health/ready)... OK (200)
      {"status":"ready","database":"connected","pool":{"total":10,"idle":8}}
[3/3] Probing Hybrid Worker Status API (/api/hybrid/status)... OK (200)
```

