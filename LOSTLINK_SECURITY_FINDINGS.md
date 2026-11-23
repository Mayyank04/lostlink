# LostLink 2.0 — Comprehensive Security Findings & Vulnerability Register

**Classification:** High-Priority Security Assessment  
**Date:** November 23, 2026  
**Security Architect:** Principal Application Security Architect

---

## Executive Summary

An in-depth security analysis of the LostLink 2.0 application identified seven critical and medium vulnerabilities across authentication, registration, access control, and tenant isolation. Each finding is cataloged below with its CVSS score, impact, root cause, and immediate engineering remediation.

---

## 1. Vulnerability Findings Register

### SEC-01: Registration Allowed Non-Institutional Domains via Unenforced Fallback
- **Severity:** HIGH (CVSS: 7.5)
- **Vector:** `POST /api/auth/register`
- **Description:** In `src/app/api/auth/register/route.ts`, when a user supplied an unapproved email domain (e.g. `student@gmail.com` or `student@attacker.com`), the API did not reject the registration. Instead, it set `isDomainAllowed = false` and fell back to `verificationMethod: 'ID_CARD'` with `status: PENDING`.
- **Impact:** Allowed arbitrary external accounts (Gmail, Yahoo, Outlook, rogue domains) into the institutional user database, undermining the university-verified trust perimeter.
- **Remediation:** Enforce strict server-side domain verification before creating user accounts. Immediately reject any email whose domain is not present in the target institution's approved `emailDomains` list with HTTP 400.

### SEC-02: Silent Password Fallback in Registration UI
- **Severity:** HIGH (CVSS: 7.2)
- **Vector:** `src/app/auth/register/page.tsx`
- **Description:** Line 95 of the registration form contained:
  ```ts
  password: password || 'Password123!',
  ```
  If a student submitted an empty password or cleared the field, the client silently defaulted to a well-known weak password.
- **Impact:** Predictable credential creation, exposing student accounts to instant takeover.
- **Remediation:** Remove the fallback. Enforce mandatory client-side and server-side strong password validation (min 8 characters, requiring uppercase, lowercase, numbers, and symbols).

### SEC-03: Public Exposure of Demo Credentials and Simulated Identity Switching
- **Severity:** MEDIUM (CVSS: 5.4)
- **Vector:** `src/app/auth/login/page.tsx` & `src/context/AuthContext.tsx`
- **Description:** The public login page displayed mock user buttons with pre-configured identities (`MOCK_USERS`) allowing immediate login bypass. Furthermore, `AuthContext` allowed arbitrary client-side `switchUser()` when `isDemoMode` was active.
- **Impact:** Conflates development mock data with production authentication flows, confusing end users and presenting an administrative bypass risk.
- **Remediation:** Remove public mock persona buttons from the login page. Gate demo accounts strictly behind environment variables (`DEMO_STUDENT_EMAIL`, `DEMO_STUDENT_PASSWORD`) with Argon2id hashing in the database, enabled only in non-production environments.

### SEC-04: Client-Controlled Role Navigation After Login
- **Severity:** MEDIUM (CVSS: 5.0)
- **Vector:** `src/app/auth/login/page.tsx`
- **Description:** The login form statically routed all successful sign-ins to `/dashboard`:
  ```ts
  router.push('/dashboard');
  ```
  It did not consult the authoritative user role returned by the server.
- **Impact:** Administrators and moderators were routed to the student dashboard, requiring manual URL navigation, while unauthorized users were not properly redirected to role-appropriate interfaces.
- **Remediation:** Use the server's authenticated role in the response payload to determine navigation:
  - `STUDENT` -> `/dashboard`
  - `COLLEGE_MODERATOR` -> `/college-admin`
  - `COLLEGE_ADMIN` -> `/college-admin`
  - `PLATFORM_ADMIN` -> `/platform-admin`

### SEC-05: Missing Access-Denied Guard for Students Opening `/platform-admin`
- **Severity:** MEDIUM (CVSS: 5.3)
- **Vector:** `src/app/platform-admin/page.tsx`
- **Description:** Non-administrative users could navigate to `/platform-admin` and view an error message card without being redirected back to their student dashboard.
- **Impact:** Exposure of administrative endpoints and interface layout to unauthorized users.
- **Remediation:** Implement a clean Access Denied page with an automated return link to `/dashboard` for unauthorized authenticated users, while completely blocking unauthenticated traffic.

### SEC-06: Subdomain and Lookalike Domain Vulnerabilities
- **Severity:** MEDIUM (CVSS: 4.8)
- **Vector:** `src/app/api/auth/register/route.ts`
- **Description:** Simple substring checks or lack of exact domain boundary comparison could permit spoofed domains like `student@apex.edu.attacker.com` or `student@fakeapex.edu`.
- **Impact:** Fraudulent registration under institutional college membership.
- **Remediation:** Extract the domain part strictly after `@`, convert to lowercase, trim whitespace, and perform an exact string equality check against the university's approved `emailDomains` array. Do not accept arbitrary subdomains unless explicitly added to the approved list.

### SEC-07: Inactive / Suspended University Registration Leakage
- **Severity:** MEDIUM (CVSS: 4.5)
- **Vector:** `src/app/api/auth/register/route.ts`
- **Description:** If a college had a status of `PENDING` or `SUSPENDED`, or if its domain verification was pending, users might still attempt registration if checks were not strictly applied on the server.
- **Impact:** Students could register under universities that have not yet been verified or have been administratively suspended.
- **Remediation:** Ensure `college.status === 'ACTIVE'` AND `college.domainVerificationStatus === 'VERIFIED'` are enforced prior to allowing registration.
