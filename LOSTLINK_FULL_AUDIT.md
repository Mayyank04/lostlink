# LostLink 2.0 — Full Project Architecture & Operational Audit

**Date:** November 23, 2026  
**Auditor:** Principal Full-Stack Engineer, Security Architect & Senior DevOps Engineer  
**Scope:** Complete repository inspection (`src/`, `prisma/`, `k8s/`, `scripts/`, `docker/`, `.github/`)

---

## 1. System Architecture & Inventory

LostLink 2.0 is a multi-tenant institutional SaaS platform designed for university campuses to coordinate lost-and-found reports, execute explainable 100-point deterministic item matching, manage physical custody escrow claims, verify returns using time-bound cryptographic dual-tokens (QR/OTP), and provide role-delineated operational governance.

### Core Stack
- **Frontend / Framework:** Next.js 14 App Router (React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts)
- **Data Layer & ORM:** PostgreSQL 16 (with Vultr Managed PostgreSQL in Production), Prisma ORM v6
- **Authentication:** Stateless & Stateful Hybrid (Argon2id password hashing, HTTP-only secure cookie sessions, JWT verification via `jose`, cryptographic 6-digit email OTPs)
- **Matching Engine:** In-cluster & Edge hybrid worker architecture polling `OutboxEvent` and leasing jobs from `MatchingJob` table
- **Object Storage:** Multi-driver support (Local filesystem, AWS S3, Vultr S3, Cloudflare R2) with magic-byte MIME validation
- **Infrastructure:** K3s Lightweight Kubernetes on Linux VPS, Traefik Ingress with automated Let's Encrypt TLS (cert-manager), Kustomize overlays (`local`, `staging`, `production`, `campus`, `vultr`)

---

## 2. Prisma Database Schema & Relationship Audit

The database schema (`prisma/schema.prisma`) models the multi-university domain effectively:
- **`College`**: The primary institutional tenant root. Holds `name`, `slug`, `emailDomains` (array), `city`, `state`, `country`, `status` (`ACTIVE`, `PENDING`, `SUSPENDED`), and configuration tokens.
- **`Campus` & `CampusLocation`**: Physical sub-locations within each institution (buildings, libraries, desks).
- **`User`**: Account identity with `role` (`STUDENT`, `COLLEGE_MODERATOR`, `COLLEGE_ADMIN`, `PLATFORM_ADMIN`) and `status` (`ACTIVE`, `SUSPENDED`, `PENDING`).
- **`CollegeMembership`**: Join entity linking `User` to `College` with `status` (`PENDING`, `VERIFIED`, `REJECTED`, `SUSPENDED`).
- **`Item`**: Lost/Found reports with report numbers, status, metadata, category, and spatial location.
- **`ItemImage` & `PrivateItemEvidence`**: Separation between public photo attachments and AES-256-GCM encrypted private ownership marks.
- **`Match`**: Deterministic explainable scoring (0–100) between Lost and Found items.
- **`Claim` & `HandoverChallenge`**: Escrow claim workflow and cryptographic OTP/QR handover confirmation.
- **`AuditLog`**: Append-only log recording actor, college, action, resource, and sanitized metadata.
- **`CollegeApplication` & `CollegeAdminInvitation`**: Onboarding workflow for new institutions.

### Schema Deficiencies Identified:
1. **Domain Verification Tracking**: `College` has `emailDomains String[]`, but lacks an explicit `domainVerificationStatus` field (`VERIFIED`, `PENDING_VERIFICATION`, `REJECTED`) and `pendingDomains String[]` to isolate unapproved domains from registration.
2. **Demo User Tracking**: No flag to distinguish demonstration test accounts from genuine student identities.
3. **Password Security Enforcement**: No `mustChangePassword` boolean on `User` to support secure initial credentials.

---

## 3. Authentication & Authorization Architecture Audit

### Strengths:
- **Argon2id** is utilized in `src/lib/auth/password.ts` with modern cryptographic parameters.
- **Session Tokens**: Database-persisted session tokens with signed JWTs via `jose` and HTTP-only cookie delivery in `src/lib/auth/session.ts`.
- **Tenant Scope Enforcement**: `src/lib/auth/tenant.ts` provides `requireAuth`, `requireCollegeMembership`, `requireCollegeAdmin`, and `requirePlatformAdmin`.

### Weaknesses & Gaps Identified:
1. **Registration Domain Bypass**: In `src/app/api/auth/register/route.ts`, if an email domain did not match `college.emailDomains`, the endpoint did not reject the request; instead it set `verificationMethod: 'ID_CARD'` with `status: PENDING`. This allowed non-institutional emails (e.g. `@gmail.com`) to be registered into the database.
2. **Hardcoded Password Fallback in UI**: In `src/app/auth/register/page.tsx`, the registration form submitted `password: password || 'Password123!'`.
3. **Public Demo Login Exposure**: `src/app/auth/login/page.tsx` included persona buttons that allowed quick login as mock users without entering credentials.
4. **Login Destination Routing**: `src/app/auth/login/page.tsx` statically redirected to `/dashboard` upon sign in, rather than checking the server-determined role (`STUDENT` -> `/dashboard`, `COLLEGE_ADMIN` -> `/college-admin`, `PLATFORM_ADMIN` -> `/platform-admin`).
5. **Lack of Access-Denied Guard for Students**: Visiting `/platform-admin` without platform admin privileges displayed an inline error card, but did not cleanly prevent unauthorized access or return unauthorized students to their dashboard.

---

## 4. University Directory & Greater Noida Region Audit

### Current Database State:
- Currently seeded with 3 demo colleges: *Apex University*, *Horizon Institute of Technology*, *Pacific Coast State University*.
- Greater Noida, Uttar Pradesh educational cluster was completely missing from the initial database seed.

### Target Greater Noida Institutional Verification:
1. **IILM University, Greater Noida**
   - Official Campus: 16, Knowledge Park II, Greater Noida, UP 201306
   - Official Website: `https://iilm.edu`
   - Verified Official Student Email Domain: `iilm.edu` (Confirmed via authoritative academic portals).
2. **Galgotias University**
   - Official Campus: Plot No. 2, Sector 17-A, Yamuna Expressway, Greater Noida, UP 203201
   - Official Website: `https://www.galgotiasuniversity.edu.in`
   - Verified Official Student Email Domain: `galgotiasuniversity.edu.in`
3. **Sharda University**
   - Official Campus: Plot No. 32-34, Knowledge Park III, Greater Noida, UP 201310
   - Official Website: `https://www.sharda.ac.in`
   - Verified Official Student Email Domains: `ug.sharda.ac.in`, `pg.sharda.ac.in`, `sharda.ac.in`
   - Note on *Sharda School of Business Studies*: Retained as a constituent school/campus under the parent institution.
4. **Bennett University**
   - Official Campus: Plot Nos 8-11, TechZone II, Greater Noida, UP 201310
   - Official Website: `https://www.bennett.edu.in`
   - Verified Official Student Email Domain: `bennett.edu.in`
5. **Noida International University (NIU)**
   - Official Campus: Plot No. 1, Sector 17-A, Yamuna Expressway, Gautam Buddha Nagar, UP 201314
   - Official Website: `https://niu.edu.in`
   - Verified Official Domain: `niu.edu.in`
6. **Gautam Buddha University (GBU)**
   - Official Campus: Yamuna Expressway, Greater Noida, Gautam Buddha Nagar, UP 201312
   - Official Website: `https://www.gbu.ac.in`
   - Verified Official Domain: `gbu.ac.in`
7. **G.L. Bajaj Institute of Technology and Management**
   - Official Campus: Plot No. 2, Knowledge Park III, Greater Noida, UP 201306
   - Official Website: `https://www.glbitm.org`
   - Verified Official Domains: `glbitm.ac.in`, `glbitm.org`
8. **Greater Noida Institute of Technology (GNIOT)**
   - Official Campus: Plot No. 7, Knowledge Park II, Greater Noida, UP 201306
   - Official Website: `https://www.gniot.net.in`
   - Verified Official Domains: `gniot.net.in`, `gniotgroup.edu.in`

---

## 5. Platform Admin & College Admin Functionality Audit

### `/platform-admin`:
- Component structure exists in `src/components/platform-admin/` with comprehensive tabs (Overview, Colleges, Applications, Admins, Students, Reports, Claims, Matching, Settings, Audit Logs, Infrastructure).
- Connected to real backend endpoints under `/api/platform-admin/*` with `requirePlatformAdmin` guards.
- Needed: Real-time domain verification controls, student suspension, session revocation, and robust system health display.

### `/college-admin`:
- Structured under `src/app/college-admin/page.tsx` and `/api/college-admin/*`.
- Scope strictly enforced by `requireCollegeAdmin(user, collegeId)`.
- Enforces institution boundaries: administrators cannot view or modify data outside their assigned college ID.

---

## 6. Docker, Kubernetes, & Deployment Configuration Audit

- **Container Build**: Multi-stage Dockerfiles (`docker/Dockerfile.web`, `docker/Dockerfile.worker`, `docker/Dockerfile.campus-worker`) building non-root (`UID 1001`) images for `linux/amd64` and `linux/arm64`.
- **Kubernetes Base**: Complete declarative manifests in `k8s/base/` with NetworkPolicies, HPAs, and ServiceAccounts.
- **Vultr Overlay**: Patched in Phase 5 to connect to Vultr Managed PostgreSQL on port `25257` with TLS, automated Let's Encrypt TLS for `lostlink-demo.duckdns.org`, and safe migration job execution.
- **Image Pinning**: Production images pinned to immutable release tags (`v2.0.0`) avoiding `latest`.
