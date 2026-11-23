# LostLink 2.0 — Master Implementation & Remediation Plan

**Objective:** Upgrade LostLink 2.0 into a fully functional, secure, multi-university production-ready platform while strictly preserving existing architecture, database relationships, matching algorithms, and UI design system.

---

## Phased Implementation Roadmap

### Phase 1: Database Schema Expansion & Safe Migration
1. **Extend `College` Model**:
   - Add `domainVerificationStatus String @default("VERIFIED")` (values: `VERIFIED`, `PENDING_VERIFICATION`, `REJECTED`)
   - Add `pendingDomains String[] @default([])`
   - Add `domainMetadata String?` (JSON metadata for DNS/verification audit)
2. **Extend `User` Model**:
   - Add `isDemoUser Boolean @default(false)`
   - Add `mustChangePassword Boolean @default(false)`
   - Add `lastLoginAt DateTime?`
3. **Generate Safe Migration**:
   - Create non-destructive Prisma migration with zero data loss.
   - Run `npx prisma generate` to refresh the Prisma Client.

---

### Phase 2: Greater Noida Educational Cluster Seeding & Domain Verification
1. **Research & Verify Official Domains**:
   - **IILM University, Greater Noida**: Verified domain `iilm.edu` (Status: `ACTIVE`, `VERIFIED`).
   - **Galgotias University**: Verified domain `galgotiasuniversity.edu.in` (Status: `ACTIVE`, `VERIFIED`).
   - **Sharda University**: Verified domains `ug.sharda.ac.in`, `pg.sharda.ac.in`, `sharda.ac.in` (Status: `ACTIVE`, `VERIFIED`). Retain *Sharda School of Business Studies* under parent university.
   - **Bennett University**: Verified domain `bennett.edu.in` (Status: `ACTIVE`, `VERIFIED`).
   - **Noida International University**: Verified domain `niu.edu.in` (Status: `ACTIVE`, `VERIFIED`).
   - **Gautam Buddha University**: Verified domain `gbu.ac.in` (Status: `ACTIVE`, `VERIFIED`).
   - **G.L. Bajaj Institute of Technology and Management**: Verified domains `glbitm.ac.in`, `glbitm.org` (Status: `ACTIVE`, `VERIFIED`).
   - **Greater Noida Institute of Technology (GNIOT)**: Verified domains `gniot.net.in`, `gniotgroup.edu.in` (Status: `ACTIVE`, `VERIFIED`).
2. **Update Database Seed (`prisma/seed.ts`)**:
   - Idempotently seed all Greater Noida institutions with exact addresses in Greater Noida, Gautam Buddha Nagar, UP, India.
   - Ensure existing demo colleges (*Apex University*, *Horizon Tech*, *PCSU*) remain intact.

---

### Phase 3: Strict Server-Side Institutional Domain & Registration Enforcement
1. **Update `POST /api/auth/register`**:
   - Strictly normalize email to lowercase and trim.
   - Extract domain after `@`.
   - Explicitly reject common public email domains: `gmail.com`, `googlemail.com`, `yahoo.com`, `yahoo.co.in`, `outlook.com`, `hotmail.com`, `icloud.com`, `proton.me`.
   - Validate target university exists and has `status === 'ACTIVE'`.
   - Validate target university has `domainVerificationStatus === 'VERIFIED'`.
   - Check exact string match in `college.emailDomains`. Reject subdomains unless explicitly in approved list.
   - Reject unapproved domains with HTTP 400: `"Your email domain (@...) is not authorized for registration at this institution."`
   - Validate password strength: minimum 8 characters, non-empty, rejected if missing. Remove all default fallback values.
   - Create student with `UserRole.STUDENT` and membership `status: 'PENDING'`.
   - Dispatch real 6-digit OTP via `createEmailVerificationOTP()`.
2. **Update `POST /api/auth/verify-college`**:
   - Validate 6-digit OTP with timing-safe comparison.
   - Transition `CollegeMembership` to `status: 'VERIFIED'`.
   - Record audit log entry.

---

### Phase 4: Authentication & UI Experience Overhaul
1. **Login Page (`/auth/login`)**:
   - Modern, responsive card layout with LostLink 2.0 branding.
   - Clean university email and password inputs with Show/Hide Password toggle button.
   - Secure "Remember Me" session selector.
   - Forgot-password link.
   - Remove public mock persona buttons.
   - Inspect server response role and route accordingly:
     - `STUDENT` -> `/dashboard`
     - `COLLEGE_MODERATOR` / `COLLEGE_ADMIN` -> `/college-admin`
     - `PLATFORM_ADMIN` -> `/platform-admin`
2. **Registration Page (`/auth/register`)**:
   - Searchable university selector with real-time domain hint.
   - Full Name, University, Official Institutional Email, Password, Confirm Password, Student ID (optional).
   - Show/Hide Password toggles.
   - Strong password strength meter / requirements list.
   - Instant domain validation indicator (e.g. green check when domain matches selected university, warning if mismatch or public provider).
   - Zero silent fallback to default password.
3. **Access Denied Page**:
   - Provide clean access-denied state if an unauthorized student attempts to view `/platform-admin`.
   - Clear button to return to `/dashboard`.

---

### Phase 5: Multi-Tenant Isolation & Role-Based Access Control
1. **Enforce 4 User Roles**:
   - `STUDENT`: Scoped strictly to their own enrolled college lost-and-found items, claims, and messages. Never permitted in `/platform-admin`.
   - `COLLEGE_MODERATOR`: Allowed moderation actions (reviewing flagged content, claims) only for their assigned college.
   - `COLLEGE_ADMIN`: Full administrative control over their assigned college (students, campuses, items, claims, analytics). Cannot view other institutions.
   - `PLATFORM_ADMIN`: Global oversight across all universities, global settings, audit logs, and domain management.
2. **Review & Audit All Endpoints**:
   - `/api/platform-admin/*` -> Protected by `requirePlatformAdmin`.
   - `/api/college-admin/*` -> Protected by `requireCollegeAdmin` with strict college ID match.
   - `/api/items/*`, `/api/claims/*`, `/api/messages/*` -> Verify student tenant isolation.

---

### Phase 6: Platform Administrator Control Center Enhancements
1. **University Management**:
   - Ability to add, edit, approve, suspend, reactivate, or archive universities.
   - Real-time Domain Verification management: add approved domains, revoke domains, view verification status.
2. **Student Management**:
   - Search, filter by university, suspend/reactivate accounts, revoke active sessions.
3. **Audit Logging & System Health**:
   - Append-only audit log display.
   - Live system health metrics without fabricated numbers.

---

### Phase 7: Secure Platform Admin Bootstrap & Demo Account Provisioning
1. **Harden `scripts/bootstrap-super-admin.ts`**:
   - Verify account exists and email is verified.
   - Update role to `PLATFORM_ADMIN` in database transaction and write immutable audit log.
   - Never allow self-service public promotion.
2. **Create Safe Demo Provisioning Utility (`scripts/provision-demo-student.ts`)**:
   - Controlled via environment variables: `DEMO_STUDENT_EMAIL`, `DEMO_STUDENT_PASSWORD`, `DEMO_STUDENT_COLLEGE_SLUG`.
   - Hashes password using Argon2id.
   - Flags `isDemoUser: true`.
   - Never outputs credentials to logs.

---

### Phase 8: Automated Test Suite & Quality Assurance
1. **Authentication Tests**: Registration, login, invalid password, empty password, duplicate email, suspended account, unverified account, logout, session revocation.
2. **Email Domain Verification Tests**: Exact domain matching, rejection of Gmail/Yahoo/Outlook, wrong university domain, pending domain rejection, case-insensitive normalization.
3. **Authorization & Tenant Isolation Tests**: Student blocked from platform-admin, student blocked from admin APIs, college admin restricted to own tenant, platform admin global access, privilege escalation prevention.
4. **Functional Integration Tests**: University selection, report creation, claims, handover, moderation.

---

### Phase 9: Verification, Typecheck, Build & Deployment Validation
1. `npx prisma validate` & `npx prisma generate`
2. `npm run typecheck`
3. `npm test`
4. `npm run lint`
5. `npm run build`
