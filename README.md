# LostLink 2.0 — Smart Multi-College Lost & Found Platform

> **Tagline:** "Lost something? Let's find it together."  
> **Course / Academic Module:** Cloud Computing Module IV PBL Project  
> **Deployment Target:** Hybrid-Cloud Architecture on Kubernetes (K8s)

---

## 1. Overview & Architecture

**LostLink 2.0** is an enterprise multi-college lost-and-found SaaS platform designed to replace fragmented social media chats and bulletin boards with an accountable, privacy-preserving institutional workflow.

Students from participating colleges can report lost belongings, register found property, discover rule-based algorithmic matches, submit zero-knowledge ownership proofs, and coordinate safe custody returns at campus lost & found desks.

```
                      ┌────────────────────────────────────────┐
                      │          LostLink 2.0 Frontend         │
                      │       Next.js 14 App Router + React    │
                      │     TypeScript + Tailwind + shadcn     │
                      └──────────────────┬─────────────────────┘
                                         │
                        [ Typed Service / API Boundary ]
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼ (Current Demo Mode)                                             ▼ (Production Target)
┌───────────────────────────────┐                       ┌──────────────────────────────────┐
│  Browser Storage & Memory     │                       │  Kubernetes Pod Deployment       │
│  - Reactive LocalStore        │                       │  - Node.js / Go REST Backend     │
│  - Seeded College Fixtures    │                       │  - PostgreSQL + Prisma ORM       │
│  - In-Browser Matching Engine │                       │  - S3 / MinIO Object Storage     │
└───────────────────────────────┘                       │  - SAML / OIDC Campus SSO        │
                                                        └──────────────────────────────────┘
```

---

## 2. Technology Stack

- **Framework:** Next.js 14 (App Router, Server/Client Component Boundaries)
- **Language:** TypeScript 5.6 (Strict type safety, zero `any` usage)
- **Styling & Design System:** Tailwind CSS with custom university tokens (`#0F172A` Navy, `#0F766E` Teal, `#2563EB` Blue)
- **Icons:** Lucide React
- **Forms & Validation:** React Hook Form & Zod schemas
- **Analytics Visualization:** Recharts (Area charts, bar charts, trend analysis)
- **Persistence & API Layer:** Typed Service Layer with reactive browser local persistence
- **Testing:** Vitest (Unit tests for matching engine, text normalization, and edge cases)
- **Containerization:** Production Multi-Stage Dockerfile with non-root security user & K8s healthchecks

---

## 3. Core Features & Capabilities

### Multi-College Campus Hierarchy
- **Apex University of Science & Technology:** STEM North Campus & Health South Campus
- **Horizon Institute of Technology:** Innovation Campus & Media West Campus
- **Pacific Coast State University:** Oceanview Campus & Downtown Metro Center
- Public directory discovery allows cross-campus searching for transit/bus losses, while private administrative features and custody desks are strictly scoped by institution.

### Deterministic, Explainable Matching Engine (100-Point Model)
LostLink eliminates hallucination and paid AI API dependency by executing deterministic weighted scoring:
- **Category Match:** 25 points (hard filter requirement)
- **Name & Title Similarity:** 25 points (Jaccard token set similarity with stopword filtering)
- **Primary & Secondary Color:** 15 points
- **Brand / Manufacturer:** 10 points (handles unspecified brands neutrally)
- **Campus Facility Proximity:** 15 points (same building: 15 pts, same campus: 10 pts, cross-college: 0 pts)
- **Timeline Plausibility:** 10 points (checks whether found date occurs after lost date)
- *Total Score: 0 – 100 with High (75%+), Medium (50-74%), and Low tiers.*

### Zero-Knowledge Ownership Verification Escrow
- When reporting a lost item, users record private clues (unique scratches, serial number snippets, lockscreen wallpapers, pocket contents).
- **These details are NEVER exposed publicly or in discovery search.**
- Claimants must provide these answers independently. Finders and campus custodians evaluate answers to verify genuine ownership before releasing belongings.

### Secure Custody Desk & 6-Digit Exchange Code
- Supports checking "Deposited with Official Campus Lost & Found Office".
- Automated generation of a 6-digit exchange code shown only to the verified claimant.
- Campus staff verify student ID and enter the exchange code to conclude the legal custody chain.
- Anti-self-approval rule prevents reporters from approving claims on items they found.

---

## 4. Reusable Component Directory

| Component | Path | Description |
|---|---|---|
| `Navbar` | `src/components/common/Navbar.tsx` | Responsive header with logo, college selector, notifications bell, theme switch, role switcher |
| `Footer` | `src/components/common/Footer.tsx` | University partner directory, PBL notice, legal links |
| `CollegeSwitcher` | `src/components/common/CollegeSwitcher.tsx` | Interactive scope switcher for colleges and campus branches |
| `RoleSwitcher` | `src/components/common/RoleSwitcher.tsx` | Demo persona toggler (Student Owner, Finder, College Admin, Platform Admin) |
| `StatusBadge` | `src/components/common/StatusBadge.tsx` | Visual differentiation for Lost, Found, Matched, Pending Claim, Returned |
| `ItemCard` | `src/components/items/ItemCard.tsx` | Safe public card supporting responsive Grid and List layouts |
| `MatchScore` | `src/components/matching/MatchScore.tsx` | Radial gauge and badge visualizing 0-100 match confidence |
| `MatchComparison` | `src/components/matching/MatchComparison.tsx` | Side-by-side comparison with explainable dimension scores |
| `ClaimForm` | `src/components/claims/ClaimForm.tsx` | Ownership verification questions and anti-self-claim protection |
| `ClaimStatusTimeline` | `src/components/claims/ClaimStatusTimeline.tsx` | Custody audit trail with timestamps and actor roles |
| `HandoverModal` | `src/components/claims/HandoverModal.tsx` | 6-digit code exchange and physical return verification |
| `MultiStepReportForm` | `src/components/reports/MultiStepReportForm.tsx` | 4-step wizard with validation, image uploads, and immediate match alerts |
| `PhotoUploader` | `src/components/reports/PhotoUploader.tsx` | Drag-and-drop image uploader with local blob previews and sample presets |
| `StatCard` | `src/components/analytics/StatCard.tsx` | Metrics card with semantic colored variants and trend indicators |
| `CategoryBreakdownChart` | `src/components/analytics/AnalyticsCharts.tsx` | Recharts bar chart showing loss vs recovery per category |
| `MonthlyRecoveryChart` | `src/components/analytics/AnalyticsCharts.tsx` | Recharts gradient area chart visualizing recovery rates |

---

## 5. Getting Started & Setup

### Prerequisites
- Node.js >= 18 (Tested on Node.js v24 & v20)
- npm >= 9

### Installation
```bash
# Clone or navigate to the project directory
cd "lostlink 2.0"

# Install dependencies
npm install

# Run matching engine unit tests
npm test

# Launch local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Testing & Quality Assurance

LostLink 2.0 includes automated unit tests covering the matching engine algorithm:

```bash
# Run all unit tests with Vitest
npm test

# Run tests in watch mode
npm run test:watch

# Run TypeScript type check
npm run typecheck

# Run Next.js production build
npm run build
```

### Verified Test Cases:
1. `Exact match`: High-confidence match (score >= 75%) between MacBook reports.
2. `Same report type rejection`: Lost vs Lost or Found vs Found returns null.
3. `Different category penalty`: Category score is 0 and total score is capped at <= 20%.
4. `Missing attributes`: Graceful fallback scoring when brand or secondary colors are absent.
5. `Incompatible date order`: Item found weeks before the lost date is penalized to score <= 25%.
6. `Cross-college penalty`: Matches between different institutions receive 0 location points and are capped at <= 30%.
7. `Partial match`: Moderate score for matching items with different campus buildings.

---

## 7. Containerization & Kubernetes Deployment

A production-ready multi-stage `Dockerfile` is provided:

```bash
# Build Docker container
docker build -t lostlink-frontend:latest .

# Run container on port 3000
docker run -p 3000:3000 lostlink-frontend:latest
```

The container runs as non-root user `nextjs` and includes a `HEALTHCHECK` for Kubernetes liveness and readiness probes (`wget --spider http://localhost:3000/`).

---

## 8. Explicit List of Remaining Backend Integrations

When connecting the containerized backend on Kubernetes:

1. **Authentication & Session Management:**
   - Replace demo `AuthContext` with SAML 2.0 / OIDC provider (e.g., Keycloak or university identity provider).
   - Enforce server-side JWT claims with user `collegeId` and `role`.
2. **Database Persistence:**
   - Connect PostgreSQL database using Prisma schema mirroring `/src/types/`.
   - Migrate report, claim, conversation, message, and notification models.
3. **Secure Object Storage:**
   - Replace in-memory Blob URLs in `PhotoUploader` with pre-signed S3 / MinIO upload URLs.
   - Enforce image MIME-type validation and EXIF metadata stripping for student privacy.
4. **WebSocket / Server-Sent Events:**
   - Connect `MessageService` and `NotificationService` to a WebSocket server for live updates.
5. **Campus Desk Physical Handover Terminal:**
   - Integrate with barcode/QR scanners at lost-and-found circulation desks for rapid 6-digit code validation.

