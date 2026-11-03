# LostLink 2.0 — Super Admin Command Center Operating Guide

> **Scope:** Platform Super Administrators (`PLATFORM_ADMIN`)  
> **Route:** `/platform-admin`  
> **Access Model:** Global cross-institutional governance and federation orchestration  

---

## 1. Role Overview & Responsibilities

The **Super Admin** is the supreme operational authority in LostLink 2.0. Unlike individual College Administrators whose jurisdiction is restricted strictly to their own university campus, the Super Admin has global oversight across all federated institutions, background worker processes, security audit logs, and system settings.

### Primary Responsibilities
1. **Federation Governance:** Provision, approve, suspend, or archive university tenants.
2. **Administrator Provisioning:** Assign and invite designated College Administrators with cryptographic invitation tokens.
3. **Account Moderation:** Enforce student conduct policies, suspend compromised accounts, and revoke active sessions.
4. **Safety & Disputes:** Review cross-college ownership claims, inspect private blind evidence, and handle reported abuse.
5. **Infrastructure Health:** Monitor PostgreSQL pool latency, container memory usage, and background matching worker keys.

---

## 2. Bootstrapping Your Super Admin Account

To guarantee zero security backdoors, LostLink 2.0 does not allow unauthenticated users or public registration forms to grant `PLATFORM_ADMIN` status. The Super Admin role must be initially bootstrapped via the secure command-line tool.

### CLI Command Syntax
```bash
npm run admin:bootstrap -- --email <your-registered-email>
```

### Verification Safeguards
1. **Account Registration Check:** Rejects requests if no account exists with the provided email.
2. **Idempotency:** If the user is already a `PLATFORM_ADMIN`, the tool safely exits with a confirmation notice without modifying data.
3. **Immutable Audit Trail:** An automatic `USER_ROLE_PROMOTION` audit log is recorded in the PostgreSQL database with the timestamp and promoting actor.

---

## 3. Command Center: 15 Core Operational Sections

The Super Admin Command Center (`/platform-admin`) provides 15 dedicated modules:

### 1. Overview & Real-Time Telemetry
- Aggregates real PostgreSQL data: total federated colleges, active vs pending tenants, verified student counts, lost vs found reports, active match pairs, and overall recovery rate.
- Displays quick-action buttons for onboarding colleges and refreshing database telemetry.
- Highlights recent security audit activity.

### 2. Manage Federated Colleges
- **Table View:** Searchable by institution name, slug, or email domain. Filterable by status (`ACTIVE`, `PENDING`, `SUSPENDED`).
- **Atomic Onboarding Modal:** Adding a college simultaneously provisions:
  - The `College` record with approved `@domain.edu` arrays.
  - An initial `Campus` (e.g. `MAIN`).
  - A default `CampusLocation` return desk (e.g. `Main Security / Desk`).
  - Optional immediate administrator assignment.
- **Tenant Lifecycle Actions:** One-click Approve, Suspend, Reactivate, or soft-archive institutions.

### 3. College Applications
- Displays self-service partnership applications submitted by university staff.
- Super Admin can review estimated student counts and contact credentials.
- Clicking **Approve & Provision** atomically creates the college, generates the main campus, and issues a 14-day cryptographic invitation token to the applicant.

### 4. College Administrators
- Directory of all institutional officers assigned the `COLLEGE_ADMIN` role.
- Shows assigned college affiliation and issuance dates.
- Modal to generate new invitation tokens or assign existing users.

### 5. Federated Student Directory
- Global view of registered students across all institutions.
- Filterable by role and account status (`ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`).
- **Account Actions:** Suspend or reinstate user accounts. Suspending a user immediately revokes all active HTTP sessions.
- **Safety Guard:** Super Admin cannot suspend their own logged-in account.

### 6. Reports & Inventory Moderation
- Unified catalog of all lost and found reports across all university campuses.
- Filter by report type (`LOST`, `FOUND`), category, and college.
- **Moderation Action:** Hide or flag inappropriate or sensitive reports from public discovery with a single click.

### 7. Ownership Claims & Disputes
- Full cross-college claims ledger.
- Inspect claimant information, finder details, and submitted private evidence (serial numbers, hidden markings).
- Facilitate dispute resolution when two students claim the same item.

### 8. Smart Matching Operations
- View total rule-based candidate pairs computed by the matching engine.
- Monitor active vs revoked background Campus Worker keys.
- **Manual Trigger:** One-click button to execute recalculation of all unmatched items.

### 9. Announcements & Broadcasts
- Broadcast high-priority banner notices displayed across student dashboards across all colleges (e.g., campus return desk holiday hours).

### 10. Abuse Moderation & Safety
- Dedicated queue for student-flagged recovery messages and chat abuse reports.
- Inspect reported message snippets, reporting student, and timestamp.

### 11. Platform Analytics
- Historical recovery metrics, lost vs found item volume, and college participation metrics.

### 12. Infrastructure & Cluster Health
- Real-time Node.js process telemetry: uptime, RSS memory footprint, heap memory.
- PostgreSQL live ping latency (measured in milliseconds).
- Hybrid Campus Worker keys status.

### 13. Immutable Audit Logs
- Searchable log of every administrative and moderation event:
  - `COLLEGE_CREATED`
  - `COLLEGE_STATUS_CHANGED`
  - `USER_STATUS_CHANGED`
  - `CLAIM_STATUS_CHANGED`
  - `SETTINGS_UPDATE`
- Modal inspector to review raw sanitized JSON metadata.

### 14. Security & RBAC Access Matrix
- Visual entitlement matrix verifying role boundaries (`PLATFORM_ADMIN`, `COLLEGE_ADMIN`, `COLLEGE_MODERATOR`, `STUDENT`).
- Displays Argon2id password security parameters, session cookie flags, and IDOR evidence isolation policies.

### 15. Platform Governance Settings
- Dynamic key-value controls saved directly to the database:
  - **Maintenance Mode:** Restricts non-admin student access during system maintenance.
  - **Open Registration:** Allows or disables new student onboarding across all colleges.
  - **Enforce Domain Matching:** Restricts registration strictly to students whose email domain matches the college's approved domain list.
  - **Matching Confidence Threshold:** Sets minimum scoring requirement (e.g. `0.65`).
  - **Max Active Claims:** Configures the limit of simultaneous pending claims per student.
