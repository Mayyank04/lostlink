# API Endpoint Catalog

## 1. Authentication (`/api/auth`)
- `POST /api/auth/register`: Register new student account.
- `POST /api/auth/verify-college`: Confirm registration with 6-digit email OTP.
- `POST /api/auth/login`: Authenticate with email and password.
- `POST /api/auth/logout`: Invalidate current session and clear session cookie.
- `GET /api/auth/me`: Retrieve current authenticated user profile and memberships.
- `POST /api/auth/forgot-password`: Request password reset OTP/token.
- `POST /api/auth/reset-password`: Reset password and invalidate all existing sessions.

---

## 2. Items & Reports (`/api/items`)
- `GET /api/items`: Search and filter lost and found items.
- `POST /api/items`: Report a new lost or found item.
- `GET /api/items/[id]`: Retrieve single item details (with evidence for authorized users).
- `PATCH /api/items/[id]`: Update item description or status.
- `DELETE /api/items/[id]`: Archive or delete item report.

---

## 3. Ownership Claims (`/api/claims`)
- `GET /api/claims`: List claims for the authenticated student or campus admin.
- `POST /api/claims`: File an ownership claim with private evidence.
- `GET /api/claims/[id]`: Retrieve claim details and status history timeline.
- `PATCH /api/claims/[id]`: Approve or reject claim (finder or campus admin).
- `POST /api/claims/[id]/dispute`: Escalate claim to campus administrator.

---

## 4. Handover & Verification (`/api/handovers`)
- `POST /api/handovers`: Generate an atomic 6-digit handover challenge.
- `POST /api/handovers/[id]/confirm`: Verify the OTP and mark item returned.
- `POST /api/handovers/[id]/regenerate`: Refresh an expired OTP code.

---

## 5. College Directory (`/api/colleges`)
- `GET /api/colleges`: List all active institutions.
- `GET /api/colleges/search`: Search colleges by name, city, state, or abbreviation.
- `GET /api/colleges/locations`: List unique countries, states, and cities with active colleges.
- `POST /api/colleges/request`: Submit a request to onboard a new university.

---

## 6. Administration Portals
- `/api/college-admin/overview`: College-scoped stats, open reports, and pending claims.
- `/api/college-admin/students`: Manage student memberships and status.
- `/api/platform-admin/overview`: Platform-wide multi-college metrics and health status.
- `/api/platform-admin/colleges`: Provision, approve, suspend, or archive university tenants.
- `/api/platform-admin/audit-logs`: Query immutable system-wide security audit logs.
