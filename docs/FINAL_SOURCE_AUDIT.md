# LOSTLINK 2.0 — FINAL SOURCE AUDIT & SECURITY VULNERABILITY REGISTER

**Document Version:** 2.0.0-AUDIT  
**Audit Date:** November 5, 2026  
**Auditor:** Principal Full-Stack, Security & Cloud Architecture Review Team  
**System Scope:** Next.js 14 App Router, PostgreSQL 16, Prisma ORM, Auth & Sessions, Claims Engine, Storage, Hybrid Outbox, Kubernetes Infrastructure

---

## 1. Executive Summary

This comprehensive source code and infrastructure audit was conducted across the entire LostLink 2.0 repository to detect, isolate, and remediate genuine security vulnerabilities, broken authentication paths, state machine bypasses, silent client data fallbacks, hardcoded credentials, and deployment defects.

A total of **15 genuine engineering defects** were catalogued, classified into P0 (Critical/High security blockers) and P1 (Reliability, data integrity, and scaling defects).

---

## 2. Vulnerability & Defect Register

### ISSUE-01: Broken Email Verification & Server-Side OTP Check Bypass
- **File and Line:** [`src/app/api/auth/verify-college/route.ts:9-78`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/api/auth/verify-college/route.ts#L9-L78), [`src/app/auth/verify-college/page.tsx:20, 40-52`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/auth/verify-college/page.tsx#L20-L52), [`src/app/api/auth/register/route.ts:57-59`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/api/auth/register/route.ts#L57-L59)
- **Root Cause:**
  1. The API route schema parses `otpCode` but the route handler never validates it against any stored token or cryptographic hash. Any arbitrary string allows verification.
  2. Registration unconditionally flags college memberships as `status: VERIFIED` based purely on domain matching without proving address ownership.
  3. The verification page contains a hardcoded demo OTP (`491823`) and a `catch` block that silently falls back to `switchUser('user-maya')` and shows false success.
- **Severity:** P0 — Critical (Authentication Bypass)
- **Affected Users:** All students, institutions, and tenant boundary controls.
- **Expected Behavior:** An authentic cryptographically secure 6-digit OTP must be generated, stored as a SHA-256 hash in `VerificationToken` with a 15-minute expiration, and verified server-side. Failed OTPs must return 400/401 with explicit error messages.
- **Required Change:**
  - Implement secure OTP generation and SHA-256 verifier storage upon registration or OTP request.
  - Enforce server-side verification in `/api/auth/verify-college`, single-use token consumption, and rate-limiting.
  - Remove prefilled demo OTP and false fallback from `src/app/auth/verify-college/page.tsx`.
- **Test Case:** Unit/integration tests verifying arbitrary OTP rejection, expired OTP rejection, single-use enforcement, and successful verification.
- **Verification Result:** Pending Implementation.

---

### ISSUE-02: Hardcoded Production Fallback for Session Secret Key
- **File and Line:** [`src/lib/auth/session.ts:11-14`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/lib/auth/session.ts#L11-L14)
- **Root Cause:** `getSecretKey()` defaults to `'dev_secret_lostlink_session_key_32_bytes_min_12345'` when `process.env.SESSION_SECRET` is unset. There is also a discrepancy where `.env.example` and `docker-compose.yml` set `AUTH_SECRET` instead of `SESSION_SECRET`.
- **Severity:** P0 — Critical (Cryptographic Weakness)
- **Affected Users:** All authenticated platform sessions across web replicas.
- **Expected Behavior:** In production (`NODE_ENV === 'production'`), startup must fail safely if neither `AUTH_SECRET` nor `SESSION_SECRET` is provided or if the key length is under 32 bytes.
- **Required Change:** Unify secret resolution across `AUTH_SECRET` and `SESSION_SECRET`; throw an explicit error in production if missing.
- **Test Case:** Test asserting startup throws when `NODE_ENV === 'production'` and secret is missing.
- **Verification Result:** Pending Implementation.

---

### ISSUE-03: Hardcoded Platform Admin Login Credentials in UI
- **File and Line:** [`src/app/platform-admin/page.tsx:89-103, 122-128`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/platform-admin/page.tsx#L89-L103)
- **Root Cause:** A "Sign In as Dr. Evelyn Reed (Super Admin)" button triggers an automatic login with hardcoded plaintext credentials (`ereed@lostlink.org` / `Password123!`).
- **Severity:** P0 — Critical (Privilege Escalation / Credential Exposure)
- **Affected Users:** Super Administrator and entire multi-college federation.
- **Expected Behavior:** Platform admin authentication must require manual entry of valid administrator credentials through the login gateway with MFA/rate limiting. No public one-click admin bypass.
- **Required Change:** Remove hardcoded credentials and the quick-login bypass button from `src/app/platform-admin/page.tsx`.
- **Test Case:** Verify that unauthenticated visitors cannot acquire `PLATFORM_ADMIN` credentials or trigger auto-login.
- **Verification Result:** Pending Implementation.

---

### ISSUE-04: Demo Identity Simulation & Role Spoofing in Production
- **File and Line:** [`src/context/AuthContext.tsx:47, 100-140, 145-181`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/context/AuthContext.tsx#L47)
- **Root Cause:** `currentUser` defaults to `MOCK_USERS[0]` on the client side. When an unauthenticated visitor accesses the app, the client initializes them as "Maya Lin" and allows browser-based identity switching (`switchUser`, `switchRole`).
- **Severity:** P0 — High (Identity Isolation)
- **Affected Users:** All student and administrative sessions.
- **Expected Behavior:** In production, `currentUser` must remain `null` unless verified with the backend via `/api/auth/me`. Demo mode must be disabled by default and only enabled when `NEXT_PUBLIC_DEMO_MODE === 'true'`.
- **Required Change:** Gate all mock user initializations behind `NEXT_PUBLIC_DEMO_MODE === 'true'` and require genuine server sessions for active users.
- **Test Case:** Verify default state for unauthenticated visitor is `currentUser === null`.
- **Verification Result:** Pending Implementation.

---

### ISSUE-05: Silent LocalStorage Fallback & False Success on Write Operations
- **File and Line:** [`src/lib/services/api.ts:205-224, 241-250, 544-550, 641-660`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/lib/services/api.ts#L205-L224)
- **Root Cause:** `ReportService.createReport`, `ReportService.updateReport`, `ClaimService.submitClaim`, and `ClaimService.confirmHandover` wrap backend API calls in `try/catch` and proceed to write to `localStorage`, returning success even if the PostgreSQL backend returned 400/401/500 or threw a network error.
- **Severity:** P0 — High (Data Loss & False State)
- **Affected Users:** Students submitting lost/found reports, claims, and returns across devices.
- **Expected Behavior:** Authoritative writes must check HTTP status and throw or return an explicit failure when the backend operation fails. They must never silently persist to browser storage and pretend the server write succeeded.
- **Required Change:** Remove silent localStorage writes on backend failure; return explicit error structures with status codes.
- **Test Case:** Test asserting report creation or claim submission fails when backend returns 500 or is unreachable.
- **Verification Result:** Pending Implementation.

---

### ISSUE-06: Plaintext JSON Serialization in `encryptedEvidence` (No Encryption at Rest)
- **File and Line:** [`src/app/api/items/route.ts:205-211`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/api/items/route.ts#L205-L211), [`src/app/api/items/[id]/route.ts:58-64`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/api/items/[id]/route.ts#L58-L64)
- **Root Cause:** Item private evidence (serial numbers, proof of purchase, proprietary marks) is stored via `JSON.stringify()` into a database column named `encryptedEvidence`. This is plaintext serialization, not cryptographic encryption.
- **Severity:** P0 — High (Data Protection & Privacy Violation)
- **Affected Users:** Students providing sensitive ownership proof.
- **Expected Behavior:** Sensitive evidence must be encrypted at rest using AES-256-GCM with an initialization vector (IV) and authentication tag. Unauthenticated or unauthorized users must never receive private evidence.
- **Required Change:** Implement authenticated AES-256-GCM encryption/decryption helpers; encrypt evidence before writing to `PrivateItemEvidence` and decrypt only for authorized callers (owner, admin/moderator). Maintain backward compatibility for legacy plaintext records.
- **Test Case:** Unit test confirming database record contains ciphertext/iv/tag and cannot be read as plaintext JSON.
- **Verification Result:** Pending Implementation.

---

### ISSUE-07: Broken Item State Machine: Reporter Can Directly Patch `status = 'RETURNED'`
- **File and Line:** [`src/app/api/items/[id]/route.ts:13, 155`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/api/items/[id]/route.ts#L13)
- **Root Cause:** `updateItemSchema` includes `status: z.enum(['OPEN', 'CLAIM_PENDING', 'RETURNED', 'CLOSED']).optional()`. The reporter (`isOwner`) can directly send `PATCH /api/items/[id]` with `status: 'RETURNED'` without an approved claim or OTP handover challenge.
- **Severity:** P0 — High (Workflow & Integrity Violation)
- **Affected Users:** Claimants, finders, campus lost-and-found moderators.
- **Expected Behavior:** Transition to `RETURNED` must ONLY occur through verified handover confirmation (`POST /api/handovers/[claimId]/confirm`) or authorized administrative resolution. Owners can only edit title, description, location, or cancel/close their report.
- **Required Change:** Disallow direct transitions to `RETURNED` and `CLAIM_PENDING` via general item patch; enforce strict state machine rules.
- **Test Case:** Test asserting an item reporter cannot directly patch status to `RETURNED`.
- **Verification Result:** Pending Implementation.

---

### ISSUE-08: Destructive Production Database Seeding Script
- **File and Line:** [`prisma/seed.ts:15-30`](file:///Users/mayankgautam/Desktop/lostlink%202.0/prisma/seed.ts#L15-L30)
- **Root Cause:** `prisma/seed.ts` begins by executing `prisma.<model>.deleteMany()` across 15 core tables. If executed in production or during deployment, all live student reports, items, claims, and institutions are permanently destroyed.
- **Severity:** P0 — Critical (Catastrophic Data Loss)
- **Affected Users:** All production databases and institutions.
- **Expected Behavior:** Seeding in production (`NODE_ENV === 'production'`) must be strictly blocked unless explicit safety bypass flags are provided, or use idempotent upserts without `deleteMany()`.
- **Required Change:** Add safety check throwing an immediate fatal error if `NODE_ENV === 'production'` or `ALLOW_DESTRUCTIVE_SEED !== 'true'`. Implement idempotent reference seeding for production bootstrapping.
- **Test Case:** Test verifying `seed.ts` halts execution with non-zero exit code when `NODE_ENV === 'production'`.
- **Verification Result:** Pending Implementation.

---

### ISSUE-09: College Resolution Fails Beyond First 50 Records on Registration
- **File and Line:** [`src/app/auth/register/page.tsx:32-50`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/auth/register/page.tsx#L32-L50), [`src/app/api/colleges/search/route.ts:7-46`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/api/colleges/search/route.ts#L7-L46)
- **Root Cause:** The registration page loads only `/api/colleges/search?limit=50`. When a user navigates to `/auth/register?college=<id>` for a college not present in the first 50 records, the selector fails to resolve the institution.
- **Severity:** P1 — Medium (Functional Failure for Growing Directory)
- **Affected Users:** Students registering at institutions beyond index 50.
- **Expected Behavior:** If `?college=<id>` is present, fetch the specific college directly by ID via API to guarantee exact resolution.
- **Required Change:** Support `id` parameter lookup in `/api/colleges/search` (or `/api/colleges/[id]`), and update registration to fetch specific college by ID.
- **Test Case:** Test resolving an institution located on page 5 or outside the top 50.
- **Verification Result:** Pending Implementation.

---

### ISSUE-10: Query Parameter Operator Precedence Bug in `/colleges` Directory
- **File and Line:** [`src/app/colleges/page.tsx:34`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/colleges/page.tsx#L34)
- **Root Cause:** `const flow = searchParams.get('flow') || searchParams.get('select') ? 'register' : 'browse';` uses flawed ternary operator precedence. If `flow=browse` is in the URL, `searchParams.get('flow')` is truthy, causing `flow` to evaluate to `'register'`.
- **Severity:** P1 — Medium (UX Navigation Defect)
- **Affected Users:** Users browsing the college directory.
- **Expected Behavior:** Only `flow === 'register'` or `select === 'true'` should trigger registration flow; `flow === 'browse'` or absent parameter must remain in browsing mode.
- **Required Change:** Fix boolean expression: `const flow = searchParams.get('flow') === 'register' || searchParams.get('select') === 'true' ? 'register' : 'browse';`.
- **Test Case:** Test asserting `?flow=browse` evaluates to `'browse'`.
- **Verification Result:** Pending Implementation.

---

### ISSUE-11: Location Hierarchies API Performs Full In-Memory Table Scans
- **File and Line:** [`src/app/api/colleges/locations/route.ts:19-42`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/app/api/colleges/locations/route.ts#L19-L42)
- **Root Cause:** The endpoint loads all active college records into Node.js application memory and iterates through them to build JavaScript `Set` collections.
- **Severity:** P1 — Medium (Performance & Scalability)
- **Affected Users:** Global college directory users under high catalog load.
- **Expected Behavior:** Location queries should utilize database-level `distinct` projections or indexes (`country`, `state`, `city`).
- **Required Change:** Rewrite location queries using Prisma `distinct` options on database queries.
- **Test Case:** Test querying location hierarchies with dynamic state/city filtering.
- **Verification Result:** Pending Implementation.

---

### ISSUE-12: Object Storage Environment Inconsistencies & Public Local Path
- **File and Line:** [`src/lib/storage/objectStorage.ts:37-60, 125-136`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/lib/storage/objectStorage.ts#L37-L60), [`.env.example:20-25`](file:///Users/mayankgautam/Desktop/lostlink%202.0/.env.example#L20-L25), [`docker-compose.yml:60-65`](file:///Users/mayankgautam/Desktop/lostlink%202.0/docker-compose.yml#L60-L65)
- **Root Cause:**
  1. `objectStorage.ts` looks for `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, while `.env.example` and `docker-compose.yml` configure `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`.
  2. Local storage writes all uploaded files—including private ownership proof—into the public asset folder `public/uploads`, allowing unauthenticated public downloads.
- **Severity:** P1 — High (Media Availability & Exposure)
- **Affected Users:** All users uploading media and private evidence.
- **Expected Behavior:** Standardize environment variables to support both `STORAGE_*` and `S3_*`. Store private files in a non-public folder, serving them only through authenticated/signed endpoints.
- **Required Change:** Normalize config in `src/lib/storage/objectStorage.ts`; isolate private uploads from `public/`.
- **Test Case:** Test file upload with `STORAGE_*` variables and verify private file path isolation.
- **Verification Result:** Pending Implementation.

---

### ISSUE-13: Hardcoded Fabricated Platform & Campus Analytics
- **File and Line:** [`src/lib/services/api.ts:923-941, 993-1014`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/lib/services/api.ts#L923-L941)
- **Root Cause:** `AnalyticsService.getPlatformAnalytics()` and `getCollegeAnalytics()` return static mock numbers (e.g. 54,800 students, 12 K8s pods, 99.98% uptime, hardcoded monthly category counts).
- **Severity:** P1 — Medium (Integrity & Governance)
- **Affected Users:** College Administrators, Platform Administrators.
- **Expected Behavior:** Analytics must be computed from real database aggregate queries (`prisma.item.count`, `prisma.claim.count`, `prisma.user.count`). If infrastructure metrics are unavailable, display "Not configured" or "No data".
- **Required Change:** Query real database metrics; remove hardcoded mock platform statistics.
- **Test Case:** Verify platform analytics reflect actual database record counts.
- **Verification Result:** Pending Implementation.

---

### ISSUE-14: In-Memory Rate Limiting Incompatible with Multi-Replica Web Deployments
- **File and Line:** [`src/lib/auth/rateLimit.ts:6-60`](file:///Users/mayankgautam/Desktop/lostlink%202.0/src/lib/auth/rateLimit.ts#L6-L60)
- **Root Cause:** Rate limits are stored in a local in-memory JavaScript `Map`. When the app scales to multiple Kubernetes pods, requests hit different replicas, effectively multiplying allowed brute-force attempts. Furthermore, `getClientIp` unconditionally trusts the first `x-forwarded-for` header without proxy boundary validation.
- **Severity:** P1 — High (Brute Force Protection)
- **Affected Users:** Authentication endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/verify-college`).
- **Expected Behavior:** Critical authentication rate limiting must coordinate across replicas or enforce secure bounded checks, while safely validating client IP headers.
- **Required Change:** Enhance rate limiter with database-backed or coordinated persistence for sensitive auth routes, and sanitize IP extraction.
- **Test Case:** Verify rate limiter blocks excess attempts across shared boundaries.
- **Verification Result:** Pending Implementation.

---

### ISSUE-15: Unversioned `prisma db push` in Kubernetes Migration Job
- **File and Line:** [`k8s/base/migration-job.yaml:44-48`](file:///Users/mayankgautam/Desktop/lostlink%202.0/k8s/base/migration-job.yaml#L44-L48)
- **Root Cause:** The Kubernetes migration Job uses `prisma db push --skip-generate` instead of versioned `prisma migrate deploy`, risking unprompted schema alterations or desynchronization in multi-instance deployments.
- **Severity:** P1 — Medium (DevOps & Database Reliability)
- **Affected Users:** DevOps deployment pipeline and database integrity.
- **Expected Behavior:** Database changes should follow deterministic, versioned migration tracking.
- **Required Change:** Establish migration baseline and create idempotent migration verification script.
- **Test Case:** Validate migration job and schema baseline.
- **Verification Result:** Pending Implementation.

---

## 3. Implementation Plan & Priority Sequencing

1. **Phase 1 (P0): Authentication & Identity Security**
   - Implement cryptographically secure email verification (OTP + SHA-256 verifier in `VerificationToken`).
   - Fix session secret key handling and fail on startup in production if missing.
   - Remove hardcoded platform admin login in `platform-admin/page.tsx`.
   - Disallow mock identity masquerading in production in `AuthContext.tsx`.
2. **Phase 2 (P0): Data Integrity & Encryption at Rest**
   - Eliminate silent localStorage write fallbacks in `src/lib/services/api.ts`.
   - Implement AES-256-GCM encryption for `privateItemEvidence`.
   - Fix item state machine in `src/app/api/items/[id]/route.ts` to prevent direct `RETURNED` updates.
   - Safeguard `prisma/seed.ts` against execution in production environments.
3. **Phase 3 (P1): Directory Search, Storage & Analytics**
   - Fix college resolution by ID for selections beyond index 50.
   - Fix operator precedence bug for query parameters in `/colleges`.
   - Optimize location hierarchy queries to use database-level distinct lookups.
   - Normalize storage environment variables (`STORAGE_*` / `S3_*`) and isolate private uploads.
   - Connect platform and college analytics to live database aggregate queries.
4. **Phase 4: Comprehensive Test Suite & Deployment Verification**
   - Execute complete test suite covering all 25 validation scenarios.
   - Verify TypeScript compilation and production Next.js build.
