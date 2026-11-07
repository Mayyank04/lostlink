# LostLink 2.0 — Vultr Cloud Compute & Single-Node K3s Deployment Guide

## 1. Executive Summary & Architecture Overview

This document provides complete, production-grade instructions for deploying the **LostLink 2.0 Multi-College Lost & Found Platform** onto a **Vultr Cloud Compute Ubuntu VPS** running lightweight single-node Kubernetes (**K3s**).

```
                              [Internet / Students / Admins]
                                             │
                                             ▼
                                  [Vultr Cloud Firewall]
                                (Ports 22, 80, 443 allowed)
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │               Vultr VPS Node              │
                       │                                           │
                       │  [Traefik Ingress Controller + TLS ACME]  │
                       │         (cert-manager / Let's Encrypt)    │
                       │                      │                    │
                       │                      ▼                    │
                       │        [lostlink-web (Next.js 14)]        │
                       │         - Standalone Node runtime         │
                       │         - Server-side sessions & OTP      │
                       │         - AES-256-GCM Evidence Encrypt    │
                       │           │                  │            │
                       │           ▼                  ▼            │
                       │  [PostgreSQL 16]   [Background Worker]    │
                       │   - StatefulSet     - Outbox consumer     │
                       │   - Local-Path PVC  - Matching engine     │
                       │   - NetworkPolicy   - Hybrid lease API    │
                       │           │                               │
                       │           ▼                               │
                       │  [Daily Backup Job]                       │
                       │   - Local retention                       │
                       │   - S3 Off-server                         │
                       └───────────────────┬───────────────────────┘
                                           │
                        (S3 API / TLS)     ▼
                       [Vultr Object Storage / AWS S3]
                        - Public Photos: /uploads/
                        - Private Ownership Evidence: /private/
                        - Database Snapshots: /backups/
```

---

## 2. Small-Pilot Resource Budget & Capacity Model

Designed for a initial multi-college rollout (2–5 colleges, 500–2,000 active students, ~100–300 item reports/week):

| Component | Minimum Specification | Recommended Specification | Vultr Plan Equivalent | Est. Monthly Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud VPS** | 1 vCPU, 2 GB RAM, 55 GB NVMe | 2 vCPU, 4 GB RAM, 80 GB NVMe | Regular Performance Cloud Compute | \$10.00 – \$20.00 |
| **Object Storage** | 250 GB storage, 1 TB transfer | 250 GB storage, 1 TB transfer | Vultr Standard Object Storage | \$5.00 |
| **Domain & DNS** | Root domain or Subdomain | Cloudflare DNS / Vultr DNS | Free DNS zone | \$0.00 |
| **TLS Certificates**| Automated Let's Encrypt ACME | Automated Let's Encrypt ACME | cert-manager HTTP-01 | \$0.00 |
| **Total Monthly** | — | — | — | **\$15.00 – \$25.00** |

### Pod Resource Allocations (Single-Node K3s)

| Workload | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **lostlink-web** | 100m (0.1 CPU) | 1000m (1.0 CPU) | 192 MiB | 512 MiB | 1 (HPA up to 3) |
| **lostlink-worker** | 50m (0.05 CPU) | 500m (0.5 CPU) | 96 MiB | 256 MiB | 1 |
| **postgres** | 100m (0.1 CPU) | 500m (0.5 CPU) | 128 MiB | 384 MiB | 1 (StatefulSet) |
| **prisma-migrate** | 50m (0.05 CPU) | 300m (0.3 CPU) | 64 MiB | 256 MiB | 1 (Init Job) |
| **K3s + Traefik** | ~150m | ~400m | ~350 MiB | ~600 MiB | System Daemon |
| **Total Baseline** | **~450m** | — | **~830 MiB** | — | **Fits in 2GB VPS** |

---

## 3. Step-by-Step Vultr VPS Provisioning

### Step 1: Create Vultr Cloud Compute Instance
1. In the Vultr Customer Portal, select **Deploy New Instance**.
2. **Server Type:** Cloud Compute (Shared CPU).
3. **Location:** Choose closest region to your campus (e.g., New Jersey `ewr`, Chicago `ord`, Silicon Valley `sjc`, Frankfurt `fra`, Mumbai `bom`).
4. **Operating System:** **Ubuntu 24.04 LTS x64** or **Ubuntu 22.04 LTS x64**.
5. **Server Size:** 2 vCPU / 4 GB RAM (\$20/mo) or 1 vCPU / 2 GB RAM (\$10/mo).
6. **SSH Keys:** Add your SSH public key.
7. Click **Deploy Now** and record the public IPv4 address (`<YOUR_VPS_IP>`).

### Step 2: Configure DNS A-Record
In your domain registrar (e.g. Cloudflare, Namecheap, GoDaddy):
- Create an **A Record**:
  - Name: `lostlink` (or `@` for apex domain)
  - Value: `<YOUR_VPS_IP>`
  - TTL: 300 seconds (or Auto)
- Verify DNS propagation:
  ```bash
  dig +short lostlink.yourdomain.com
  ```

---

## 4. Server Initialization & Hardening

SSH into your Vultr server as `root`:
```bash
ssh root@<YOUR_VPS_IP>
```

Run the automated LostLink bootstrap script:
```bash
curl -fsSL https://raw.githubusercontent.com/Mayyank04/lostlink/main/infrastructure/public-cloud/vultr-k3s-bootstrap.sh -o vultr-k3s-bootstrap.sh
bash vultr-k3s-bootstrap.sh lostlink.yourdomain.com
```

This single command executes:
1. System package upgrades & dependencies (`curl`, `git`, `ufw`, `fail2ban`, `htop`, `jq`).
2. UFW Firewall hardening (allows SSH `22`, HTTP `80`, HTTPS `443`; explicitly blocks external access to `5432` and `6443`).
3. K3s installation with Traefik ingress controller, Local Path Provisioner, and Metrics Server.
4. cert-manager v1.17.0 installation.
5. Let's Encrypt `ClusterIssuer` configuration for automated TLS.

---

## 5. Clone Repository & Configure Production Secrets

```bash
git clone https://github.com/Mayyank04/lostlink.git /opt/lostlink
cd /opt/lostlink
```

### A. Create Production Secret
```bash
cp k8s/overlays/vultr/secret.example.yaml k8s/overlays/vultr/secret.yaml
```

Generate strong cryptographically secure keys:
```bash
openssl rand -base64 32 # For DB Password
openssl rand -base64 32 # For AUTH_SECRET
openssl rand -base64 32 # For CAMPUS_WORKER_API_KEY
```

Edit `k8s/overlays/vultr/secret.yaml`:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lostlink-secrets
  namespace: lostlink
stringData:
  POSTGRES_USER: "lostlink_admin"
  POSTGRES_PASSWORD: "<STRONG_DB_PASSWORD>"
  POSTGRES_DB: "lostlink"
  DATABASE_URL: "postgresql://lostlink_admin:<URL_ENCODED_DB_PASSWORD>@<VULTR_POSTGRES_HOST>:25257/lostlink?sslmode=require&schema=public"
  AUTH_SECRET: "<32_CHAR_AUTH_SECRET>"
  SESSION_SECRET: "<32_CHAR_AUTH_SECRET>"
  NEXTAUTH_SECRET: "<32_CHAR_AUTH_SECRET>"
  STORAGE_ACCESS_KEY_ID: "<YOUR_VULTR_S3_KEY>"
  STORAGE_SECRET_ACCESS_KEY: "<YOUR_VULTR_S3_SECRET>"
  CAMPUS_WORKER_API_KEY: "<STRONG_CAMPUS_API_KEY>"
```

Apply the secret directly to the cluster:
```bash
kubectl apply -f k8s/overlays/vultr/secret.yaml
```

### B. Configure Hostname in ConfigMap & Ingress
Edit `k8s/overlays/vultr/configmap-patch.yaml`:
```yaml
  NEXTAUTH_URL: "https://lostlink.yourdomain.com"
  NEXT_PUBLIC_APP_URL: "https://lostlink.yourdomain.com"
  STORAGE_PUBLIC_URL: "https://<YOUR_BUCKET>.<REGION>.vultrobjects.com"
  POSTGRES_HOST: "<VULTR_POSTGRES_HOST>"
  POSTGRES_PORT: "25257"
  PGSSLMODE: "require"
```

Edit `k8s/overlays/vultr/ingress-patch.yaml`:
```yaml
spec:
  tls:
    - hosts:
        - lostlink.yourdomain.com
      secretName: lostlink-vultr-tls
  rules:
    - host: lostlink.yourdomain.com
```

---

## 6. Deploy LostLink 2.0 to Vultr K3s

Execute the automated zero-downtime deployment script:
```bash
bash scripts/deploy-vultr.sh
```

The script performs:
1. Cluster connectivity verification.
2. Manifest compilation and application via Kustomize.
3. Automated database migration execution (`prisma migrate deploy`).
4. Rolling update rollout monitoring with automatic rollback protection.
5. In-cluster readiness probe smoke test.

Verify all running components:
```bash
kubectl get pods,services,ingress,certificates -n lostlink
```

Expected output:
```
NAME                                   READY   STATUS      RESTARTS   AGE
pod/lostlink-db-migrate-xxxxx          0/1     Completed   0          90s
pod/lostlink-web-xxxxxxxxxx-xxxxx      1/1     Running     0          60s
pod/lostlink-worker-xxxxxxxxxx-xxxxx   1/1     Running     0          60s

NAME                   TYPE        CLUSTER-IP      PORT(S)    AGE
service/lostlink-web   ClusterIP   10.43.x.x       3000/TCP   2m

NAME                                        CLASS     HOSTS                    ADDRESS         PORTS     AGE
ingress.networking.k8s.io/lostlink-ingress  traefik   lostlink.yourdomain.com  <YOUR_VPS_IP>   80, 443   2m
```

### Install or update the GitHub Actions deploy entry point

On the VPS, install the reviewed scripts as root from the repository checkout.

```bash
install -o root -g root -m 0755 infrastructure/public-cloud/lostlink-ci-ssh /usr/local/bin/lostlink-ci-ssh
install -o root -g root -m 0755 infrastructure/public-cloud/lostlink-ci-release /usr/local/sbin/lostlink-ci-release
```

Keep `/opt/lostlink`, its deployment script, and its Kubernetes manifests root-owned and nonwritable by `lostlink-ci`. The locked `lostlink-ci` account uses `restrict,command="/usr/local/bin/lostlink-ci-ssh"` on its authorized key. Its sudo rule permits only `/usr/local/sbin/lostlink-ci-release` with no arguments. The launcher accepts `deploy <full commit SHA>` over SSH and passes the validated SHA to the server-side release script.

Keep the local K3s admin kubeconfig at mode `0600` and block public access to TCP `6443`. GitHub's `production` environment is restricted to `main` and holds `VULTR_DEPLOY_SSH_KEY` and `VULTR_DEPLOY_KNOWN_HOSTS`. Store credential values outside Git. Run the production workflow from `main` with the full release SHA.

The VPS checks the migration Job, deployed image revisions, and the worker heartbeat and database access. A retry for the same release waits for both rollouts and repeats verification without restarting either workload.

---

## 7. Database Backups & Off-Server Archival

### Automated Kubernetes CronJob
The deployment includes a scheduled Kubernetes CronJob (`lostlink-postgres-backup`) running daily at `02:00 AM UTC`, backing up the database to durable PVC storage and pruning backups older than 7 days.

### Manual On-Demand Backup & Off-Server S3 Archival
Run the included backup script on the host:
```bash
bash scripts/vultr-backup-s3.sh
```
This produces a gzip-compressed database snapshot (`/var/backups/lostlink/lostlink_db_YYYYMMDD_HHMMSS.sql.gz`) and automatically synchronizes it to your configured Vultr S3 Object Storage bucket.

### Database Restoration Procedure
To restore the database from a backup file:
```bash
# 1. Uncompress and restore database into postgres-0
gunzip -c /var/backups/lostlink/lostlink_db_20261105_120000.sql.gz | \
  kubectl exec -i postgres-0 -n lostlink -- psql -U lostlink_admin -d lostlink

# 2. Restart web and worker pods to sync cache
kubectl rollout restart deployment/lostlink-web deployment/lostlink-worker -n lostlink
```

---

## 8. Operational Troubleshooting & Runbook

### Inspect Application Logs
```bash
# Web application logs
kubectl logs -n lostlink -l app=lostlink-web --tail=100 -f

# Background worker logs
kubectl logs -n lostlink -l app=lostlink-worker --tail=100 -f

# Database logs
kubectl logs -n lostlink postgres-0 --tail=50
```

### Check Database Health
```bash
kubectl exec -it postgres-0 -n lostlink -- pg_isready
```

### Inspect TLS Certificate Status
```bash
kubectl describe certificate lostlink-vultr-tls -n lostlink
kubectl describe clusterissuer letsencrypt-prod
```

### Emergency Rollback
If a newly pushed image or config creates errors:
```bash
# Roll back Web to previous working release
kubectl rollout undo deployment/lostlink-web -n lostlink

# View rollout revision history
kubectl rollout history deployment/lostlink-web -n lostlink
```

---

## 9. Small-Pilot Verification Checklist

After deploying to your public Vultr server, complete this validation runbook:

- [ ] **Public HTTPS Access:** Open `https://lostlink.yourdomain.com` in a browser on an external network. Verify valid SSL padlock from Let's Encrypt.
- [ ] **Readiness Probe:** Access `https://lostlink.yourdomain.com/api/health/ready` and confirm `status: "ready"` with database latency reported.
- [ ] **Super Admin Login:** Sign in to `/platform-admin` using established administrative credentials.
- [ ] **Provision College:** Navigate to College Management and create a new college record with valid email domain pattern.
- [ ] **College Search & Directory:** Visit `/colleges` and verify instant search, regional filtering, and selection.
- [ ] **Student Registration & OTP:** Register an account with your college email. Check terminal logs for the 6-digit cryptographic OTP and verify your account.
- [ ] **Report Lost/Found Item:** Submit a found item report with photo attachment. Confirm encrypted evidence is stored securely.
- [ ] **Matching Engine:** Verify background worker logs show match recalculation triggered and candidate scores calculated.
- [ ] **Claim & Dual OTP Handover:** Initiate ownership claim, approve claim as finder/admin, generate handover challenge OTP, and confirm exchange.

