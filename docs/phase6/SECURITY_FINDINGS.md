# LostLink 2.0 — Security Findings Log & Vulnerability Register

## Overview

This register documents all security findings identified during the Phase 6 audit of LostLink 2.0, along with their reproduction steps, risk classifications, remediations, and verified outcomes.

---

## Vulnerability Register

### FINDING SEC-01: In-Memory Rate Limiting Reset on Multi-Pod Scaling
- **Classification**: High (P1)
- **Affected Component**: `src/lib/auth/rateLimit.ts` / Next.js API Routes
- **Description**: Authentication rate-limiting initially relied on an in-memory `Map` within the Next.js process. When the application scaled to multiple pods via HPA, an attacker could bypass rate limits by distributing rapid login requests across different web pod replicas.
- **Reproduction**:
  1. Scale `lostlink-web` to 3 replicas.
  2. Send 20 rapid login attempts with alternating connections.
  3. Notice that pod A, B, and C each maintained separate attempt counters, effectively tripling the brute-force threshold.
- **Remediation**:
  1. Ingress-level connection rate limiting configured in Traefik middleware (`average: 10, burst: 20` per client IP).
  2. Next.js auth endpoint enforces progressive exponential backoff delays on repeated authentication failures.
- **Verification Evidence**: Automated test in `src/tests/auth.test.ts` confirms repeated requests are throttled.
- **Remaining Risk**: Minimal. Single IPs with distributed proxy botnets require Cloudflare WAF for campus pilot.

---

### FINDING SEC-02: Cross-Site Scripting (XSS) via SVG File Uploads
- **Classification**: High (P1)
- **Affected Component**: `src/lib/storage/objectStorage.ts`
- **Description**: Standard image upload forms that accept `.svg` files risk Stored Cross-Site Scripting because SVG files can contain embedded `<script>` tags that execute in the browser context of any user viewing the image.
- **Reproduction**:
  1. Upload `test.svg` containing `<svg><script>alert(document.cookie)</script></svg>`.
  2. If served inline with `image/svg+xml`, the script executes.
- **Remediation**:
  `src/lib/storage/objectStorage.ts` strictly permits only binary image formats:
  ```typescript
  const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  ```
  SVG uploads are rejected at the server boundary with HTTP 400.
- **Verification Evidence**: `src/tests/security-owasp.test.ts` rejects `xss.svg` upload with `Unsupported file type: image/svg+xml`.
- **Remaining Risk**: None. Binary JPEG/PNG/WebP cannot execute script tags in modern browsers.

---

### FINDING SEC-03: Potential Insecure Direct Object Reference (IDOR) on Item Mutating Routes
- **Classification**: Critical (P0)
- **Affected Component**: `src/app/api/items/[id]/route.ts`
- **Description**: If a student could modify or archive an item report simply by providing its ID in a `PATCH` or `DELETE` request without verifying `reporterId === session.userId`, users could alter reports belonging to others.
- **Reproduction**:
  1. Student A reports a lost item with ID `item_101`.
  2. Student B sends `PATCH /api/items/item_101` with `status: 'RETURNED'`.
- **Remediation**:
  Enforced mandatory ownership verification in `src/app/api/items/[id]/route.ts`:
  ```typescript
  if (item.reporterId !== session.userId && session.role !== 'COLLEGE_ADMIN' && session.role !== 'PLATFORM_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized to modify this report' }, { status: 403 });
  }
  ```
- **Verification Evidence**: Verified in `src/tests/tenant.test.ts` and `src/tests/security-owasp.test.ts`. Unauthorized edits fail with HTTP 403.
- **Remaining Risk**: None.

---

### FINDING SEC-04: OTP Handover Code Replay Attack
- **Classification**: High (P1)
- **Affected Component**: `src/lib/handover/otp.ts`
- **Description**: If a 6-digit OTP code remained valid after being submitted once, a malicious user intercepting the code could attempt to claim multiple items.
- **Reproduction**:
  1. Student A and Finder B complete a return using OTP `481920`.
  2. Attempt to submit OTP `481920` again for the same challenge.
- **Remediation**:
  The confirmation handler executes an atomic PostgreSQL transaction:
  1. Verifies `HandoverChallenge.status === 'ACTIVE'`.
  2. Updates `HandoverChallenge.status = 'COMPLETED'`.
  3. Sets `Item.status = 'RETURNED'`.
  Subsequent attempts fail because status is no longer `ACTIVE`.
- **Verification Evidence**: Verified in `src/tests/handover.test.ts`. Second confirmation attempt is rejected immediately.
- **Remaining Risk**: None.

---

### FINDING SEC-05: Timing Information Leak in Machine API Key Comparison
- **Classification**: Medium (P2)
- **Affected Component**: `src/lib/hybrid/auth.ts`
- **Description**: Using JavaScript `===` to compare API key hashes allows an attacker to deduce the correct hash character-by-character based on response latency differences.
- **Reproduction**:
  Standard equality operator short-circuits on the first mismatched byte, creating measurable nanosecond timing variations.
- **Remediation**:
  Replaced standard comparison with `crypto.timingSafeEqual()`:
  ```typescript
  const incomingHashBuf = Buffer.from(incomingKeyHash, 'hex');
  const storedHashBuf = Buffer.from(record.apiKeyHash, 'hex');
  if (incomingHashBuf.length === storedHashBuf.length && crypto.timingSafeEqual(incomingHashBuf, storedHashBuf)) {
    // Validated
  }
  ```
- **Verification Evidence**: Verified in `src/tests/hybrid-matching.test.ts`.
- **Remaining Risk**: None. Timing variations eliminated.

---

## Summary of Remediations

| Finding ID | Severity | Status | Verification Method |
| :---: | :---: | :---: | :---: |
| **SEC-01** | High | **RESOLVED** | Traefik rate-limit + exponential backoff |
| **SEC-02** | High | **RESOLVED** | Strict binary MIME-type allowlist |
| **SEC-03** | Critical | **RESOLVED** | Server-side reporter ID and role checks |
| **SEC-04** | High | **RESOLVED** | Atomic single-use status transition |
| **SEC-05** | Medium | **RESOLVED** | Constant-time `crypto.timingSafeEqual()` |
