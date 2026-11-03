# LostLink 2.0 — Free Public Cloud Hosting & Ingress Architecture Guide

> **Target Audience:** DevOps Engineers, University Cloud PBL Evaluators, Platform Super Administrators  
> **Cost Profile:** **\$0.00 / Month** (100% Free Forever Tiers)  
> **Platform Target:** Multi-Institution Federated Lost & Found System  

---

## 1. Executive Summary & Feasibility Analysis

LostLink 2.0 is designed as a cloud-native, multi-college lost-and-found federation platform. To pilot the application with real students across multiple universities without incurring cloud infrastructure bills, this document details three production-grade, zero-cost deployment paths.

### Architecture Comparison Matrix

| Capability / Resource | Option A: Oracle Cloud Always Free (Ampere A1) | Option B: Cloudflare Zero Trust Tunnel (Hybrid Edge) | Option C: Vercel + Neon PostgreSQL |
| :--- | :--- | :--- | :--- |
| **Monthly Compute Cost** | **\$0.00 / month (Always Free)** | **\$0.00 / month (Always Free)** | **\$0.00 / month (Hobby Free)** |
| **CPU / vCPU** | **4 OCPU (Ampere Altra ARM64)** | Host-dependent (Local Mac / PC / VPS) | Serverless execution |
| **RAM** | **24 GB RAM** (Split across 1–4 VMs) | Host-dependent (e.g. 16–32 GB) | 1024 MB execution limit |
| **Storage** | **200 GB Block Storage (NVMe)** | Local disk / external SSD | 0.5 GB Postgres Storage |
| **Kubernetes (K8s) Ready** | **Yes (k3s / MicroK8s on Ubuntu ARM)** | **Yes (routes to local k3d / minikube)** | No (Serverless functions only) |
| **Public HTTPS Ingress** | Free Static IPv4 + Oracle VCN + ACME | Cloudflare Global Anycast CDN + Edge TLS | `*.vercel.app` auto-provisioned TLS |
| **Open Ports Required** | 80, 443 (Firewall ingress) | **Zero inbound open ports required** | Zero inbound open ports |
| **Long-Term Sustainability** | **Highest (Dedicated 24GB Server)** | **Excellent for hybrid pilot** | Moderate (Database compute pause) |

---

## 2. Option A: Oracle Cloud Always Free (Recommended for Real Multi-College Deployment)

Oracle Cloud Infrastructure (OCI) offers an **Always Free Tier** featuring Ampere A1 Compute instances with up to **4 OCPUs and 24 GB of RAM**, plus **200 GB of NVMe block storage**. This provides ample capacity to host a multi-node or single-node lightweight Kubernetes cluster (`k3s`), PostgreSQL 16, Redis, and the LostLink frontend and backend at \$0 cost indefinitely.

### 2.1 Provisioning the Ampere A1 Instance
1. Register for an [Oracle Cloud Always Free Account](https://www.oracle.com/cloud/free/).
2. Navigate to **Compute → Instances → Create Instance**.
3. Choose:
   - **Image:** Canonical Ubuntu 22.04 LTS (Minimal or Standard).
   - **Shape:** `VM.Standard.A1.Flex` (Ampere).
   - **Cores:** 4 OCPU.
   - **Memory:** 24 GB RAM.
   - **Networking:** Assign a Public IPv4 Address.
   - **SSH Keys:** Paste your local machine's public key (`cat ~/.ssh/id_rsa.pub`).

### 2.2 Security List / Firewall Configuration
In OCI Virtual Cloud Network (VCN) Ingress Rules, allow:
- `TCP 80` (HTTP for Let's Encrypt ACME challenge)
- `TCP 443` (HTTPS for student traffic)
- `TCP 6443` (Kubernetes API — restricted to admin IP)

On the Ubuntu instance:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### 2.3 Single-Command Lightweight Kubernetes (`k3s`) Setup
```bash
# Install k3s with Traefik ingress controller enabled
curl -sfL https://get.k3s.io | sh -

# Verify cluster status
sudo kubectl get nodes -o wide
# Architecture will report: linux/arm64
```

### 2.4 Multi-Architecture ARM64 Docker Builds
Because Ampere instances run on ARM64 architecture, build and push multi-arch container images using `docker buildx`:
```bash
# 1. Create buildx multi-platform builder
docker buildx create --use --name lostlink-builder
docker buildx inspect --bootstrap

# 2. Build and push both ARM64 and AMD64 images
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-dockerhub-user/lostlink-app:2.0 \
  -f Dockerfile \
  --push .
```

---

## 3. Option B: Cloudflare Zero Trust Tunnel (Instant Pilot Deployment)

Cloudflare Tunnel provides an immediate, secure public HTTPS ingress for LostLink 2.0 without opening any ports on your local router or requiring a static IP address.

### 3.1 Quick Pilot Mode (TryCloudflare)
To immediately expose your local Kubernetes cluster (`http://localhost:8080`) or local dev server:
```bash
# Run the automated deployment script
npm run tunnel:public
```
This automatically initiates a Cloudflare edge tunnel and outputs a live, globally reachable HTTPS URL:
```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://lostlink-campus-demo.trycloudflare.com                                            |
+--------------------------------------------------------------------------------------------+
```

### 3.2 Production Named Tunnel with Custom Domain (e.g. `lostlink.org` or `lostlink.duckdns.org`)
1. Create a free account at [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Zero Trust → Networks → Tunnels → Add a Tunnel**.
3. Select **Cloudflared**, name the tunnel `lostlink-production`.
4. Copy your Tunnel Token:
   ```bash
   export TUNNEL_TOKEN="eyJhIjoiYTM1M2...YOUR_CLOUDFLARE_TOKEN"
   npm run tunnel:public
   ```
5. In Cloudflare Tunnel Public Hostname configuration:
   - **Service:** `HTTP`
   - **URL:** `localhost:8080` (or `lostlink-ingress.default.svc.cluster.local`)
   - **Domain:** `lostlink.org` (or subdomain `app.lostlink.org`)

---

## 4. Production Readiness Checklist

Before onboarding active students from multiple universities:

- [x] **Super Admin Bootstrapped:** Run `npm run admin:bootstrap -- --email <your-verified-email>` to secure the `/platform-admin` console.
- [x] **Database Constraints Verified:** Argon2id password hashing, unique institutional email constraints, and cascaded membership deletions tested via `npm test`.
- [x] **SSL/TLS Ingress Active:** Confirm all traffic is routed through Cloudflare Edge TLS or Let's Encrypt ACME with HTTP Strict Transport Security (HSTS).
- [x] **Colleges Initialized:** Ensure at least one college, campus, and location desk are provisioned in PostgreSQL via `/platform-admin`.
- [x] **Automatic Backups Configured:** Schedule daily PostgreSQL automated dumps using `scripts/backup-database.sh`.
- [x] **Health Probes Tested:** Verify `/api/health/ready` returns HTTP 200 with active database and storage readiness.
