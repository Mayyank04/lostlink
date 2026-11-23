# Production Deployment Guide (Kubernetes / K3s on Vultr)

## Architecture Overview

LostLink is packaged for Kubernetes deployment using **Kustomize**, with a `base/` configuration and a production `overlays/vultr/` target connecting to **Vultr Managed PostgreSQL** on port `25257` with TLS and S3-compatible **Vultr Object Storage**.

```
[Ingress (Traefik / TLS)]
         |
         v
[LostLink Web Service (ClusterIP: 3000)]
         |
         +---> [LostLink Web Pods (Deployment, HPA 2-10)]
         |
         +---> [LostLink Worker Pods (Matching & Notifications)]
         |
         +---> [Vultr Managed PostgreSQL (Port 25257, SSL mode: require)]
         |
         +---> [Vultr Object Storage (S3 API)]
```

---

## 1. Secrets Management
Never commit actual passwords or private tokens to Git.
Use `k8s/overlays/vultr/secret.example.yaml` as the template:

```bash
kubectl create secret generic lostlink-secrets \
  --namespace=lostlink \
  --from-literal=DATABASE_URL="postgresql://vultradmin:PASSWORD@vultr-db-host.vultrdb.com:25257/defaultdb?sslmode=require" \
  --from-literal=SESSION_SECRET="64-character-production-session-encryption-key" \
  --from-literal=STORAGE_ACCESS_KEY="VULTR_STORAGE_ACCESS_KEY" \
  --from-literal=STORAGE_SECRET_KEY="VULTR_STORAGE_SECRET_KEY"
```

---

## 2. Kustomize Build & Deployment
Inspect the rendered manifest before applying:
```bash
kubectl kustomize k8s/overlays/vultr
```

Deploy to K3s / Kubernetes cluster:
```bash
kubectl apply -k k8s/overlays/vultr
```

---

## 3. Migration Execution Order
1. The `migration-job` runs as an init step or pre-deployment hook:
   - Verifies database connectivity via `pg_isready` against port `25257`.
   - Executes `prisma migrate deploy` to safely apply pending versioned schema migrations.
2. Web and worker pods wait for the migration job to complete successfully before serving traffic.

---

## 4. Health & Monitoring Probes
- **Liveness Probe:** `GET /api/health/live` (confirms process responsiveness).
- **Readiness Probe:** `GET /api/health/ready` (confirms database connectivity and cache responsiveness).
- **Horizontal Pod Autoscaler (HPA):** Scales web deployment from 2 to 10 replicas based on CPU (70%) and memory (80%) thresholds.
