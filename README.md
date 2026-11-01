# LostLink 2.0 — Smart Multi-College Lost & Found Platform

> **Tagline:** "Lost something? Let's find it together."  
> **Course / Academic Module:** Cloud Computing Module IV PBL Project  
> **Architecture:** Production Full-Stack Next.js 14 App Router + PostgreSQL + Prisma ORM + Multi-Tenant Security

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

## 10. Production Deployment (Docker & Kubernetes)

### Production Container Build
```bash
docker build -t lostlink:2.0 .
docker run -p 3000:3000 --env-file .env lostlink:2.0
```

### Kubernetes Readiness & Liveness Probes
LostLink includes a dedicated `/api/health` route handler reporting database latency:
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 11. Git Feature Branch & Submission

- **Repository:** `https://github.com/Mayyank04/lostlink`
- **Phase 3 Feature Branch:** `phase-3-recovery`
- **Main Branch:** `main`
