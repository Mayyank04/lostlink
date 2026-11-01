# LostLink 2.0 — Phase 4 Infrastructure Implementation Plan

**Cloud Computing Module IV PBL Project**  
**Component:** Phase 4 — Docker, Kubernetes, Scalability, Container Security, CI/CD & Cloud-Native Infrastructure  
**Author:** Principal Cloud Architect & DevOps Platform Team  
**Date:** November 2026  
**Target Environment:** macOS Apple Silicon ARM64 (`aarch64`) / Kubernetes via `k3d`  

---

## 1. System & Hardware Audit

Before designing or modifying any infrastructure, the host development machine was audited:

- **Hardware Architecture:** Apple Silicon ARM64 (`arm64` / `aarch64`)
- **Operating System:** macOS 26.6.1 (Darwin 25G76)
- **Host Memory:** 16 GB Physical RAM (17,179,869,184 bytes)
- **Host Disk Space:** 44 GiB available on root APFS volume
- **Docker Desktop Version:** Engine 29.9.2, Compose v5.6.1, Buildx v0.38.1
- **Docker VM Resources:** 10 CPUs, 7.748 GiB allocated RAM, `cgroupfs` v2, `overlayfs` snapshotter
- **Kubernetes CLI (`kubectl`):** v1.36.1 (Kustomize v5.8.1 built-in)
- **Cluster Orchestrator (`k3d`):** v5.9.0 (K3s v1.35.5-k3s1 default)
- **Node.js Environment:** v24.15.0 / npm 11.11.0

### Key Compatibility Determinations:
1. **Multi-Architecture Support:** The development Mac runs ARM64 natively. Docker builds on this machine run natively at native speeds (`linux/arm64`). For production portability, multi-arch builds (`linux/arm64` and `linux/amd64`) will be configured in CI/CD using GitHub Actions and Docker Buildx with QEMU emulation.
2. **Debian-Slim vs Alpine:** Prisma ORM 6.4.1 and Argon2id compile and link native C/C++ binaries (`libssl`, `glibc`). Alpine Linux uses `musl` libc which has historically required special binary target configuration (`linux-musl-arm64-openssl-3.0.x`). Using `node:20-slim` (Debian Bookworm) provides native glibc compatibility, smaller image size than full Ubuntu, and avoids runtime OpenSSL mismatch issues.
3. **RAM Budgeting:** The Docker engine has ~7.75 GB RAM available. A 1-server + 1-agent node k3d cluster consumes ~800 MB RAM idle. PostgreSQL consumes ~150 MB, Web replicas consume ~120 MB each, and Worker consumes ~90 MB. This fits comfortably within the 7.75 GB boundary with >5 GB headroom.

---

## 2. Infrastructure Architecture Overview

```
                                [ External Ingress Traffic ]
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │     k3d Traefik / LB      │ (Port 8080 / 8443)
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │   Kubernetes Ingress      │ (Host: lostlink.local)
                               │      (lostlink-web)       │
                               └─────────────┬─────────────┘
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
       ┌───────────────────────────┐                   ┌───────────────────────────┐
       │   lostlink-web Service    │                   │   Horizontal Pod Auto-    │
       │    (ClusterIP : 3000)     │                   │       scaler (HPA)        │
       └─────────────┬─────────────┘                   │  2-5 Replicas @ 60% CPU   │
                     │                                 └───────────────────────────┘
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐               ┌─────────────────┐
│ Web Pod (Repl 1)│     │ Web Pod (Repl 2)│               │ Worker Pod (1)  │
│  Next.js 14     │     │  Next.js 14     │               │ Outbox & Match  │
│  (Port 3000)    │     │  (Port 3000)    │               │ Event Processor │
└────────┬────────┘     └────────┬────────┘               └────────┬────────┘
         │                       │                                 │
         └───────────────────────┼─────────────────────────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │   postgres Service    │ (ClusterIP : 5432)
                     │ (NetworkPolicy Lock)  │
                     └───────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │  postgres StatefulSet │
                     │   PostgreSQL 16 DB    │
                     │  (PersistentVolume)   │
                     └───────────────────────┘
```

---

## 3. Storage & Persistence Requirements

1. **Relational Database (`PostgreSQL 16`):**
   - Configured with persistent volumes (`PersistentVolumeClaim` in Kubernetes, named volume `postgres_data` in Docker Compose).
   - Survives container destruction, rolling deployments, and host restarts.
   - Health probes (`pg_isready -U postgres -d lostlink_dev`) ensure zero downtime routing.
2. **Media & Document Assets:**
   - Dual-mode storage abstraction:
     - Local Dev / Test: MinIO S3 or local directory volume mounted into containers.
     - Production / Phase 5: Cloudflare R2 / AWS S3 via environment credentials.
3. **Database Migrations:**
   - Single-execution Kubernetes `Job` (`lostlink-migrate`) running `npx prisma db push` / `prisma migrate deploy`.
   - Guaranteed to execute before new web application Pods receive traffic.

---

## 4. Background Worker Architecture

1. **Durable Transactional Outbox:**
   - The worker runs as an independent daemon decoupled from Next.js HTTP request handling.
   - Polls `OutboxEvent` table using atomic status claims (`status: 'PENDING'` $\to$ `'PROCESSING'`).
   - Ensures multiple worker replicas never process the same job twice.
2. **Worker Responsibilities:**
   - Asynchronous matching calculation (`MATCH_RECALCULATION`)
   - Expired handover challenge cleanup (`HANDOVER_EXPIRATION`)
   - Notification dispatching (`NOTIFICATION`)
   - Inactive session archival (`CLEANUP`)
3. **Graceful Termination:**
   - Listens for `SIGTERM` and `SIGINT`, finishes in-flight jobs, releases locks, and exits cleanly.

---

## 5. Security & Isolation Matrix

| Layer | Security Measure | Implementation |
| :--- | :--- | :--- |
| **Container Images** | Non-root execution | User `nextjs` (UID 1001, GID 1001), no root permissions |
| **Filesystem** | Minimal attack surface | Multi-stage build copying only `.next/standalone` and assets |
| **Kubernetes RBAC** | Least Privilege ServiceAccount | Pods run under `lostlink-app-sa` without cluster-admin rights |
| **Network Security** | `NetworkPolicy` | PostgreSQL port 5432 accessible **only** by pods with label `role: web` or `role: worker` |
| **Secret Management** | Separated K8s Secrets | Database password and auth token stored in Kubernetes Secret; never in Git |
| **Probes** | Decoupled Liveness/Readiness | Liveness tests process responsiveness; Readiness tests DB connection |

---

## 6. Implementation Steps

1. **Subphase 4.1:** Infrastructure audit, plan creation, and Git checkpoint.
2. **Subphase 4.2:** Multi-stage production `Dockerfile.web` and `Dockerfile.worker`.
3. **Subphase 4.3:** Local multi-service `docker-compose.yml` (Web, Worker, Postgres, MinIO, Mailpit).
4. **Subphase 4.4:** `k3d` local Kubernetes cluster setup (`lostlink-cluster`).
5. **Subphase 4.5:** Kubernetes manifests (`k8s/base` and `k8s/overlays/local`).
6. **Subphase 4.6:** Health endpoints (`/api/health/live`, `/api/health/ready`) and self-healing tests.
7. **Subphase 4.7:** Horizontal scaling (manual + HPA metrics load testing).
8. **Subphase 4.8:** Hardening (NetworkPolicy, non-root pod security, least-privilege).
9. **Subphase 4.9:** GitHub Actions CI/CD pipelines (`ci.yml`, `docker-publish.yml`).
10. **Subphase 4.10:** Database backup/restore scripts and PBL documentation.

