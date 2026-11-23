# LostLink 2.0 — Architecture & Clean Code Standard

## System Summary
LostLink 2.0 is an enterprise-grade, multi-university lost-and-found management platform designed for strict data isolation, cryptographic verification, automated matching, and multi-tenant administrative governance.

---

## 1. Architectural Layers

### Layer 1: Presentation & Client State
- Built on **Next.js 14 App Router** using React Server Components (RSC) and Client Components.
- Follows the anti-AI-slop design system documented in `DESIGN.md`.
- Interacts with backend APIs via typed, domain-specific client services in `src/lib/services/`:
  - `items.client.ts`: Lost/found reporting and item queries.
  - `claims.client.ts`: Ownership claim submission and review.
  - `matches.client.ts`: Match score discovery and reviews.
  - `messages.client.ts`: Secure in-app messaging threads.
  - `notifications.client.ts`: Activity notifications and read statuses.
  - `colleges.client.ts`: Directory search and campus locations.
  - `analytics.client.ts`: Institution and platform performance metrics.

### Layer 2: API & Gateway Layer
- Endpoints located under `src/app/api/`.
- Validates request payloads with **Zod** schemas in `src/lib/validation/schemas.ts`.
- Enforces session authentication via `requireAuth(req)`.
- Validates tenant membership via `requireCollegeMembership(user, collegeId)`.
- Formats uniform success/error JSON via `src/lib/api/response.ts` (`apiSuccess`, `apiError`).

### Layer 3: Server Business Logic & Services
- Server-only service classes located in `src/server/services/`:
  - `itemService`: Validates report parameters, assigns human-readable reference numbers (`LL-YYYY-XXXX`), manages transactions, and triggers match evaluations.
  - `claimService`: Enforces anti-self-claim protection, verifies item eligibility, manages claim status history, and delivers multi-party notifications.
  - `handoverService`: Coordinates 6-digit physical return challenges and verifies SHA-256 hashes atomically.
  - `collegeService`: Handles college onboarding, campus location trees, and tenant search queries.

### Layer 4: Data Access & Persistence
- Repositories in `src/server/repositories/` isolate Prisma ORM operations and SQL clauses from API routes.
- Relational schema defined in `prisma/schema.prisma` targeting **PostgreSQL 16**.
- Schema migrations applied deterministically via `prisma migrate deploy`.

---

## 2. Multi-Tenant Security & Cryptography
- **Argon2id Password Security:** Passwords hashed with OWASP-recommended parameters (64MB RAM, 3 iterations).
- **Session Tokens:** Cryptographically random 32-byte tokens stored in PostgreSQL with HTTP-only cookies.
- **Evidence Protection:** Sensitive proof of purchase and serial numbers encrypted via AES-256 before database insertion.
- **Zero Client Trust:** Administrative roles, student verification status, and college memberships are never accepted from client headers or payloads; they are loaded directly from the database session.
- **Handover One-Time Passwords:** 6-digit verification codes are hashed with SHA-256; only the recipient holds the plaintext code.

---

## 3. Distributed Matching Engine
- Multi-attribute scoring calculates item title (15-35 pts), category (25 pts), brand (15 pts), color (10 pts), building location (10 pts), and temporal proximity (5-10 pts).
- High-confidence matches (>= 75 pts) and moderate matches (>= 40 pts) notify users and trigger claim recommendations.
- Heavy match calculations can be offloaded asynchronously to campus background workers via `src/lib/hybrid/queue.ts`.

---

## 4. Verification & Testing Matrix
- **19 Test Files / 179 Automated Tests** (100% pass rate).
- **Strict TypeScript** (`tsc --noEmit` exits with 0 errors).
- **Next.js Production Build** compiles all 57 static and dynamic pages with zero errors.
