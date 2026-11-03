# LostLink 2.0 — Smart Multi-College Lost & Found Platform

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker)
![Kubernetes](https://img.shields.io/badge/Kubernetes-K3s%20%2F%20k3d-326CE5?logo=kubernetes)
![Architecture](https://img.shields.io/badge/Architecture-Hybrid--Cloud%20Edge-success?logo=wireguard)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Vitest](https://img.shields.io/badge/Tests-81%20Passing-success?logo=vitest)
![Super Admin](https://img.shields.io/badge/Super%20Admin-15%20Modules-purple?logo=shield)
![Hosting](https://img.shields.io/badge/Public%20Hosting-%240.00%2Fmo%20Free-success?logo=cloudflare)

> **Tagline:** "Lost something? Let's find it together."  
> **Course / Academic Module:** Cloud Computing Module IV PBL Project  
> **Architecture:** Hybrid-Cloud Distributed Architecture (Public Cloud K3s + Multi-College Federation + Super Admin Command Center)

---

## 1. Executive Summary & Architecture

**LostLink 2.0** is an enterprise-grade multi-college lost-and-found SaaS platform designed to replace fragmented social media chats and bulletin boards with a secure, privacy-preserving institutional registry.

The platform provides multi-institution tenant isolation, deterministic rule-based matching (without paid AI APIs), cryptographic zero-knowledge ownership verification, and an auditable campus custody handover workflow.

```
                           ┌────────────────────────────────────────┐
                           │          LostLink 2.0 Web Client       │
                           │       Next.js 14 App Router + React    │
                           │     TypeScript + Tailwind + shadcn     │
                           └──────────────────┬─────────────────────┘
                                              │
                                 [ HTTP-Only Session Cookies ]
                                 [ RESTful JSON Route APIs   ]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌───────────────────────────────┐              ┌──────────────────────────┐
         │     Next.js API Handlers      │              │ Object Storage Engine    │
         │   - /api/auth/* (Argon2id)    │              │ - Cloudflare R2 / S3     │
         │   - /api/items (Isolation)    │              │ - MinIO Local S3 Dev     │
         │   - /api/claims (Escrow)      │              │ - Local Disk Fallback    │
         │   - /api/matches (Engine)     │              └──────────────────────────┘
         │   - /api/admin (RBAC)         │
         │   - /api/health (K8s Probe)   │
         └──────────────┬────────────────┘
                        │
                  [ Prisma ORM ]
                        │
         ┌──────────────┴────────────────┐
         │ PostgreSQL Relational Cluster │
         │ - Multi-Tenant Foreign Keys   │
         │ - Cascade Deletion & Auditing │
         │ - B-Tree Indexes on Lookups   │
         └───────────────────────────────┘
```

---

## 2. Technology Stack

- **Framework:** Next.js 14 (App Router with Server/Client Component Boundaries)
- **Language:** TypeScript 5.6 (Strict type safety, zero `any` usage)
- **Database & ORM:** PostgreSQL 16 with Prisma ORM 6.4.1
- **Password Security:** Argon2id (`argon2` v0.45.1) conforming to OWASP parameters (19 MiB memory, 2 iterations, 1 parallelism)
- **Sessions & JWT:** Encrypted & Signed HTTP-only session cookies via `jose` (HS256) backed by the database `Session` model for revokability
- **Validation:** Zod v4 schemas for all incoming API payloads and environment variables
- **Object Storage:** Abstraction layer supporting Cloudflare R2, MinIO S3, and local filesystem storage with MIME validation, 10MB limits, and filename sanitization
- **Rate Limiting:** Sliding-window in-memory rate limiting on auth endpoints to prevent brute-force attacks
- **Testing:** Vitest 2.1.8 with automated unit and integration tests across database constraints, authentication, tenant isolation, and storage security
- **Containerization & Deployment:** Docker Compose for local development (Postgres 16, MinIO, Mailpit) and production multi-stage Dockerfile for Kubernetes

---

## 2.1 Master Upgrade: Super Admin Command Center & Multi-College Architecture

LostLink 2.0 has been upgraded with enterprise-grade multi-institution federation governance:

1. **Super Admin Command Center (`/platform-admin`):**
   - **15 Integrated Modules:** Overview, Manage Colleges, Applications, College Admins, Students, Reports, Claims & Disputes, Matching Operations, Announcements, Moderation, Analytics, Infrastructure Health, Audit Logs, Security & RBAC, Platform Settings.
   - **Atomic Tenant Provisioning:** Provisions College, initial Campus (`MAIN`), return desk (`CampusLocation`), and cryptographic invitation in a single database transaction.
   - **CLI Bootstrap Tool:** Promote any verified account idempotently via `npm run admin:bootstrap -- --email <email>`.
   - **Zero-Mock Telemetry:** 100% real PostgreSQL metrics, Node.js process RSS memory, and DB ping latency.

2. **Scoped College Administrator Panel (`/college-admin`):**
   - Jurisdiction strictly restricted to the administrator's authorized college with zero cross-tenant leakage.
   - Student membership approval and physical student ID card verification.
   - Campus and drop-off desk manager.
   - In-person item return confirmation via 6-digit OTP code verification.

3. **Dynamic Student Registration (`/auth/register`):**
   - Dynamically pulls active institutions from database without code changes or redeployments.
   - Automatic domain matching against approved `@domain.edu` arrays for instant verification.

4. **Free Public Cloud Hosting (\$0.00/month Forever Tier):**
   - Fully evaluated architecture for Oracle Cloud Always Free Ampere A1 (4 OCPU, 24 GB RAM, 200 GB NVMe) and Cloudflare Zero Trust Tunnel.
   - Automated edge ingress script: `npm run tunnel:public`.
   - Complete guides:
     - [Free Public Hosting & Deployment Guide](docs/upgrade/FREE_HOSTING_DEPLOYMENT_GUIDE.md)
     - [Super Admin Operating Guide](docs/upgrade/SUPER_ADMIN_OPERATING_GUIDE.md)
     - [College Onboarding Guide](docs/upgrade/COLLEGE_ONBOARDING_GUIDE.md)
     - [Student User Guide](docs/upgrade/STUDENT_ONBOARDING_GUIDE.md)
     - [Security & Automated Testing Report](docs/upgrade/SECURITY_AND_TESTING_REPORT.md)

---

## 3. Multi-College Tenant Isolation Model

LostLink is built from the ground up for strict multi-institution data isolation:

1. **Institutional Domain Matching:** During registration, email domains (`@apex.edu`, `@horizon.edu`, `@pacific.edu`) are validated against the institution's official domains. Matching domains receive `VERIFIED` status; external domains remain `PENDING` until approved by college moderators.
2. **Server-Side Tenant Enforcement:** All write operations (`POST /api/items`, `POST /api/claims`, `PATCH /api/items/[id]`) execute server-side verification using `requireCollegeMembership(user, collegeId)`. Cross-college item injection is rejected with `HTTP 403 Forbidden`.
3. **Role-Based Access Control (RBAC):**
   - **`STUDENT`:** Can report items and initiate ownership claims within their verified college; can browse public items across campuses.
   - **`COLLEGE_MODERATOR` / `COLLEGE_ADMIN`:** Scoped administrative authority strictly limited to their own college. They can review pending claims, verify student IDs, moderate reports, and inspect institution analytics.
   - **`PLATFORM_ADMIN`:** Global infrastructure oversight, cross-college diagnostics, and institution lifecycle management.
4. **Data Isolation in Queries:** Normal discovery queries never leak private items or unverified membership data across colleges.

---

## 4. PostgreSQL Database Schema (15 Prisma Models)

The database schema (`prisma/schema.prisma`) implements 15 normalized relational models:

```mermaid
erDiagram
    College ||--o{ Campus : contains
    College ||--o{ CollegeMembership : has
    College ||--o{ Item : registers
    Campus ||--o{ CampusLocation : houses
    Campus ||--o{ Item : locates
    User ||--o{ CollegeMembership : holds
    User ||--o{ Item : reports
    User ||--o{ Claim : submits
    User ||--o{ Session : creates
    User ||--o{ Notification : receives
    User ||--o{ AuditLog : generates
    Item ||--o{ ItemImage : displays
    Item ||--o| PrivateItemEvidence : protects
    Item ||--o{ Match : lost_matches
    Item ||--o{ Match : found_matches
    Item ||--o{ Claim : targets
```

### Key Models & Security Considerations:
- **`College`:** `id`, `name`, `slug` (unique), `emailDomains` (array), `logoUrl`, `city`, `state`, `status` (`PENDING`, `ACTIVE`, `SUSPENDED`).
- **`Campus` & `CampusLocation`:** Hierarchical facilities mapping buildings, floors, and official custody desks.
- **`User`:** `id`, `name`, `email` (unique), `emailVerified`, `passwordHash` (Argon2id), `role` (`STUDENT`, `COLLEGE_MODERATOR`, `COLLEGE_ADMIN`, `PLATFORM_ADMIN`), `status` (`ACTIVE`, `SUSPENDED`).
- **`CollegeMembership`:** Scoped membership linking user and college, with verification tracking (`VERIFIED`, `PENDING`, `REJECTED`, `SUSPENDED`).
- **`Item`:** `reportNumber` (unique), `type` (`LOST` or `FOUND`), `name`, `category`, `brand`, `color`, `description`, `occurredAt`, `locationBuilding`, `status` (`OPEN`, `CLAIM_PENDING`, `RETURNED`, `CLOSED`), `depositedWithOffice`.
- **`PrivateItemEvidence`:** **Isolated 1-to-1 table.** Stores encrypted/serialized verification secrets (serial numbers, engravings, lockscreen details). **Never joined or sent in public listing queries.**
- **`Match`:** Stores deterministic 0-100 similarity scores and detailed breakdown between lost and found items.
- **`Claim`:** Manages ownership claims, answers to verification questions, handover exchange codes, and audit timelines.
- **`AuditLog`:** Immutable audit trail recording actor, action, resource, timestamp, and sanitized metadata.
- **`Session`:** Stores database tokens with expiration dates, IP addresses, and user-agent details for revokable session management.

---

## 5. Complete REST API Catalog

All endpoints are implemented as native Next.js 14 App Router Route Handlers under `/api/*`:

### Authentication & Identity
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Register student, validate domain, hash password with Argon2id, create session |
| `/api/auth/login` | `POST` | Public | Authenticate credentials, check suspension, set HTTP-only cookie |
| `/api/auth/logout` | `POST` | Auth | Invalidate database session and clear cookie |
| `/api/auth/me` | `GET` | Optional | Return current authenticated user profile and college memberships |
| `/api/auth/verify-college` | `POST` | Auth | Verify institutional email OTP or student ID card |
| `/api/auth/forgot-password` | `POST` | Public | Generate timed password reset token |
| `/api/auth/reset-password` | `POST` | Public | Verify reset token and update password hash |

### Colleges & Campuses
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/colleges` | `GET` | Public | List active colleges with campus count and active item statistics |
| `/api/colleges/[id]` | `GET` | Public | Retrieve college details, campuses, and registered facilities |
| `/api/campuses/[id]/locations` | `GET` | Public | List specific buildings and drop-off points for a campus |

### Items & Reports
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/items` | `GET` | Public | Search directory (filters: `type`, `collegeId`, `campusId`, `category`, `status`, `search`, pagination). Excludes private evidence. |
| `/api/items` | `POST` | Member | Create lost/found report. Requires active college membership. Isolates private evidence into secure table and triggers matching engine. |
| `/api/items/[id]` | `GET` | Public | Retrieve item details. Returns private evidence **only** if requester is owner or authorized moderator. |
| `/api/items/[id]` | `PATCH` | Owner/Admin | Update item status (`RETURNED`, `CLOSED`) or details. |
| `/api/items/[id]` | `DELETE` | Owner/Admin | Soft-delete report (sets status to `CLOSED`). |

### Claims & Escrow Handover
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/claims` | `GET` | Auth | List user's submitted claims or received claims on their found items (or college-wide for admins). |
| `/api/claims` | `POST` | Auth | Submit ownership verification claim with private proof on a found item. |
| `/api/claims/[id]` | `PATCH` | Finder/Admin | Approve or reject claim. Sets item to `RETURNED` upon approval and generates audit logs. |

### Matching Engine & Notifications
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/matches` | `GET` | Auth | Retrieve calculated matches for user's reports or institution. |
| `/api/matches/[id]/dismiss` | `POST` | Party/Admin | Mark suggested match as dismissed. |
| `/api/notifications` | `GET` | Auth | Get user notifications with unread counter. |
| `/api/notifications/[id]/read`| `PATCH` | Auth | Mark single notification as read. |
| `/api/notifications/read-all` | `POST` | Auth | Mark all user notifications as read. |

### File Storage & System Operations
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/uploads` | `POST` | Auth | Multipart image upload. Validates MIME type, enforces 10MB limit, sanitizes filename. |
| `/api/dashboard/stats` | `GET` | Optional | Real database counts for lost, found, returned items, and pending claims. |
| `/api/dashboard/activity` | `GET` | Optional | Recent reports and suggested matches. |
| `/api/users/me/items` | `GET` | Auth | List reports created by current authenticated user. |
| `/api/admin/stats` | `GET` | Admin | Institutional metrics (resolution rate, members, active reports). |
| `/api/admin/reports` | `GET` | Admin | Complete institution report catalog for moderation. |
| `/api/admin/memberships` | `GET` | Admin | Pending and active student membership requests. |
| `/api/admin/memberships/[id]` | `PATCH` | Admin | Approve (`VERIFIED`) or suspend membership. |
| `/api/health` | `GET` | Public | Kubernetes readiness/liveness probe checking PostgreSQL latency. |

---

## 6. Object Storage Configuration

LostLink abstracts file storage behind `src/lib/storage/objectStorage.ts`:

- **Local Storage (`STORAGE_PROVIDER=local`):** Default for development. Saves files into `public/uploads/YYYY-MM-DD/` and serves via `/uploads/...`.
- **MinIO S3 (`STORAGE_PROVIDER=s3`):** S3-compatible local development storage running in Docker Compose (`http://localhost:9000`).
- **Cloudflare R2 (`STORAGE_PROVIDER=r2`):** Zero-egress production object storage via S3 API.

### Environment Configuration:
```env
STORAGE_PROVIDER=local       # 'local' | 's3' | 'r2'
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=lostlink-storage
S3_REGION=us-east-1
S3_PUBLIC_URL=http://localhost:9000/lostlink-storage
```

---

## 7. Local Development Setup Guide

### Prerequisites
- Node.js 18+ or 20+
- PostgreSQL 14+ (Native or via Docker)

### Option A: Quickstart with Local PostgreSQL
1. **Clone and Install:**
   ```bash
   git clone https://github.com/Mayyank04/lostlink.git
   cd lostlink
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Update DATABASE_URL with your PostgreSQL connection string
   # e.g. DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lostlink_dev?schema=public"
   ```

3. **Initialize Database Schema:**
   ```bash
   npx prisma db push
   ```

4. **Seed Development Fixtures:**
   ```bash
   npm run db:seed
   ```
   *Seeds 3 colleges, 6 campuses, locations, Argon2id users (`Password123!`), real items, images, and private evidence.*

5. **Run Automated Test Suite:**
   ```bash
   npm test
   ```

6. **Start Next.js Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option B: Quickstart with Docker Compose
To run PostgreSQL, MinIO, and Mailpit together:
```bash
docker compose up -d
npm run db:seed
npm run dev
```
- **Postgres:** `localhost:5432` (db: `lostlink_dev`, user: `lostlink_user`, pass: `lostlink_secure_password_2026`)
- **MinIO Console:** [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`)
- **Mailpit Web UI:** [http://localhost:8025](http://localhost:8025)

---

## 8. Seeded Test Credentials

All seeded accounts use password: `Password123!`

| Role | Name | Email | Institution Scope |
|---|---|---|---|
| **Student** | Maya Lin | `maya.lin@apex.edu` | Apex University (STEM North Campus) |
| **Student** | Lucas Vance | `lucas.v@horizon.edu` | Horizon Institute (Innovation Campus) |
| **College Admin** | Dr. Sarah Jenkins | `admin@apex.edu` | Apex University (Full Admin Scope) |
| **Platform Admin** | System SuperAdmin | `ops@lostlink.org` | Global Cross-College Oversight |

---

## 9. Automated Testing & Verification (54 / 54 Passing Tests)

The test suite covers:
- **`src/tests/auth.test.ts`:** Argon2id password hashing, verification, sliding-window rate limiting.
- **`src/tests/db.test.ts`:** Database connectivity, unique constraints on emails, cascade deletion, private evidence isolation.
- **`src/tests/tenant.test.ts`:** Multi-college authorization, cross-college write rejection, admin privileges.
- **`src/tests/storage.test.ts`:** MIME allowlists, 10MB limits, filename traversal sanitization.
- **`src/tests/matching.test.ts`:** 100-point explainable matching engine, model number conflicts, synonyms, color aliases, chronology.
- **`src/tests/claims.test.ts`:** Ownership claims state machine, anti-self-claim protection, evidence requests, cancellation, status history.
- **`src/tests/handover.test.ts`:** Cryptographic 6-digit OTP, SHA-256 tokens, timing-safe verification, expiration checks.
- **`src/tests/messaging.test.ts`:** PostgreSQL conversations, message sending, unread counters, access control, abuse reporting.
- **`src/tests/e2e-recovery.test.ts`:** **Full 11-step end-to-end recovery lifecycle (Report $\to$ Match $\to$ Claim $\to$ Evidence $\to$ Approval $\to$ Handover $\to$ Return).**
- **`src/lib/matching/engine.test.ts`:** Deterministic matching edge cases.

Execute tests via:
```bash
npm test          # Run Vitest test suite (10 test suites, 54 tests)
npm run typecheck # Verify zero TypeScript errors
npm run build     # Verify full Next.js production build
```

---

## 10. Phase 4 Cloud-Native Infrastructure (Docker & Kubernetes)

LostLink 2.0 is fully orchestrated for local execution and production cloud deployments:

### Option A: Local Kubernetes Deployment via `k3d` (Recommended for PBL)
```bash
# 1. Audit system prerequisites (Apple Silicon / Docker / k3d)
./scripts/check-prerequisites.sh

# 2. Initialize dual-node Kubernetes cluster with Traefik Ingress
./scripts/k8s-create-cluster.sh

# 3. Build & import lean multi-stage images
./scripts/k8s-build-load.sh

# 4. Deploy Kustomize manifests (DB StatefulSet, Migration Job, Web, Worker, HPA, Ingress)
./scripts/k8s-deploy.sh

# 5. Execute automated smoke tests
./scripts/k8s-test.sh

# 6. Run load test & autoscaling benchmark (200 req/sec)
./scripts/load-test.sh http://localhost:8080/api/health/ready 200 20
```

Access Points:
- **Web App via Ingress:** [http://localhost:8080](http://localhost:8080) (or `http://lostlink.local:8080`)
- **Liveness Probe:** [http://localhost:8080/api/health/live](http://localhost:8080/api/health/live)
- **Readiness Probe:** [http://localhost:8080/api/health/ready](http://localhost:8080/api/health/ready)

### Option B: Local Development with Docker Compose
```bash
# Launch Compose stack (Postgres 16, Mailpit, Next.js Web, Background Worker)
./scripts/docker-up.sh

# Stop Compose stack
./scripts/docker-down.sh
```

### Database Backup & Disaster Recovery
```bash
# Dump PostgreSQL state from the active Kubernetes pod
./scripts/k8s-backup-db.sh

# Restore from a backup SQL dump
./scripts/k8s-restore-db.sh backups/lostlink_k8s_backup_20261101_213521.sql
```

---

## 11. Phase 5: Hybrid-Cloud & Edge Architecture

Phase 5 extends LostLink 2.0 into a real distributed **Hybrid-Cloud Architecture**:
- **Environment A (Public Cloud VPS)**: Runs Next.js 14 web app, PostgreSQL, Traefik Ingress with automatic Let's Encrypt TLS certificates, and a cloud fallback watchdog daemon.
- **Environment B (Private College Edge Node)**: Runs a dedicated campus matching worker on university hardware or campus VMs behind firewalls.
- **Outbound-Only Protocol**: The campus agent requires **zero inbound firewall ports** or static IPs; it polls `/api/hybrid/jobs/lease` outbound over HTTPS.
- **Zero-Knowledge Privacy Boundary**: Student PII and private ownership evidence are never transmitted across the hybrid link.
- **Automated Failover & Split-Brain Elimination**: If the campus agent disconnects, the cloud fallback worker reclaims orphaned jobs after a 30s TTL. Delayed submissions are atomically rejected, guaranteeing zero duplicate match records.

### Running the Live Hybrid Failover Benchmark
```bash
# Execute automated 4-stage hybrid failover benchmark
./scripts/test-hybrid-failover.sh

# Monitor real-time queue depth and campus worker heartbeat metrics
./scripts/check-hybrid-status.sh

# Test non-destructive database backup & restore drill
./scripts/restore-test.sh
```

---

## 12. Complete Phase 5 Documentation Guides

Comprehensive documentation is provided in the `docs/` directory:

1. [**Phase 5 Deployment Plan**](docs/PHASE5_DEPLOYMENT_PLAN.md) — Architectural overview, deployment milestones, and verification gates.
2. [**Public Cloud Deployment Guide**](docs/PUBLIC_CLOUD_DEPLOYMENT.md) — Ubuntu 24.04 VPS hardening, K3s installation, cert-manager Let's Encrypt TLS, and custom domain setup.
3. [**Hybrid-Cloud Architecture Specification**](docs/HYBRID_CLOUD_ARCHITECTURE.md) — Public vs. Private topology, zero-inbound-port protocol, distributed state machine, and data minimization boundary.
4. [**Campus Worker Installation Manual**](docs/CAMPUS_WORKER_SETUP.md) — IT administrator manual for deploying the edge agent via Docker Compose, Systemd, or Kubernetes.
5. [**Hybrid Failover Benchmark Report**](docs/HYBRID_FAILOVER_TEST.md) — Verified benchmark logs demonstrating sub-10ms matching, automated cloud fallback, and split-brain rejection.
6. [**Phase 5 Cost Analysis & ROI**](docs/PHASE5_COST_ANALYSIS.md) — Cost comparison in USD & INR (₹84.50/$) proving 93.1% savings vs. AWS EKS.
7. [**Production Security Checklist**](docs/PRODUCTION_SECURITY_CHECKLIST.md) — Defense-in-depth security matrix, UFW rules, machine key SHA-256 auth, and key revocation runbook.
8. [**Backup & Disaster Recovery Runbook**](docs/BACKUP_RECOVERY.md) — RPO < 1hr, RTO < 5min targets, automated daily CronJobs, and offsite disaster recovery playbook.
9. [**Phase 5 Verification & Test Report**](docs/PHASE5_TEST_REPORT.md) — Complete audit evidence matrix covering all 60 passing tests and zero regressions.
10. [**PBL Demonstration & Viva Guide**](docs/PBL_DEMONSTRATION_GUIDE.md) — Step-by-step 5-minute presentation script with **25 beginner-friendly viva questions and answers**.

---

## 13. Continuous Integration & Multi-Architecture Delivery

- **CI Pipeline (`.github/workflows/ci.yml`):** Runs on push and pull requests, executing linting, TypeScript compilation, Vitest test suites, and Next.js production builds.
- **Staging Pipeline (`.github/workflows/staging-deploy.yml`):** Automatically tests and validates Kustomize overlays and builds staging images.
- **Production Pipeline (`.github/workflows/production-deploy.yml`):** Gated production workflow pushing immutable SHA-tagged images to GHCR and deploying to Kubernetes with automatic rollback.

---

## 14. Git Feature Branch & Submission

- **Repository:** `https://github.com/Mayyank04/lostlink`
- **Phase 5 Feature Branch:** `phase-5-hybrid-cloud`
- **Phase 4 Feature Branch:** `phase-4-cloud-native`
- **Phase 3 Feature Branch:** `phase-3-recovery`
- **Phase 2 Feature Branch:** `phase-2-backend`
- **Main Branch:** `main`
