# LostLink 2.0 — OWASP ASVS 5.0 Security & Data Integrity Audit Report

## 1. Executive Summary
This document specifies the security review, vulnerability assessment, and cryptographic verification conducted on **LostLink 2.0** under the guidelines of the **OWASP Application Security Verification Standard (ASVS) 5.0** and India's **Digital Personal Data Protection (DPDP) Act, 2023**.

All 11 automated security tests in `src/tests/security-owasp.test.ts` passed with a **100% success rate**.

---

## 2. OWASP ASVS 5.0 Verification Matrix

| ASVS Section | Security Control | Implementation in LostLink 2.0 | Automated Test Evidence | Status |
|---|---|---|---|---|
| **V2: Authentication** | **Argon2id Password Security** | Passwords hashed using Argon2id ($m=65536, t=3, p=4$); brute-force resistant. | `security-owasp.test.ts` (Test 1) | **PASS** |
| **V3: Session Mgmt** | **JWT Tampering Rejection** | Modifying signature, header, or payload invalidates the token immediately. | `security-owasp.test.ts` (Test 2) | **PASS** |
| **V3: Session Mgmt** | **Session Expiration** | Expired tokens are rejected with HTTP 401; no stale session persistence. | `security-owasp.test.ts` (Test 3) | **PASS** |
| **V4: Access Control** | **Multi-Tenant College Isolation** | Private evidence from College A cannot be read or modified by College B. | `security-owasp.test.ts` (Test 4) | **PASS** |
| **V4: Access Control** | **IDOR / BOLA Prevention** | Users cannot edit, claim, or delete reports owned by another student. | `security-owasp.test.ts` (Test 5) | **PASS** |
| **V5: Injection Defense** | **Parameterized SQL Queries** | Prisma ORM enforces 100% parameterized queries; `' OR 1=1 --` inert. | `security-owasp.test.ts` (Test 6) | **PASS** |
| **V5: Injection Defense** | **Stored XSS Neutralization** | Malicious `<script>` tags stored in titles/descriptions are rendered as plain text. | `security-owasp.test.ts` (Test 7) | **PASS** |
| **V12: File Uploads** | **MIME-Type Whitelisting** | Strictly allows `image/jpeg`, `image/png`, `image/webp`. | `security-owasp.test.ts` (Test 8) | **PASS** |
| **V12: File Uploads** | **Executable File Rejection** | Uploads with extensions `.exe`, `.sh`, `.php`, `.svg` are rejected. | `security-owasp.test.ts` (Test 9) | **PASS** |
| **V12: File Uploads** | **File Size Boundaries** | Uploads exceeding 5MB are rejected to prevent storage exhaustion attacks. | `security-owasp.test.ts` (Test 10) | **PASS** |
| **API Security** | **Machine Key Authentication** | Campus Edge Workers authenticate via SHA-256 hashed keys (`CampusWorkerKey`). | `security-owasp.test.ts` (Test 11) | **PASS** |

---

## 3. Infrastructure & Network Security Hardening

### 3.1 Network Isolation & Restricted Ports
- **Public Ingress**: Only ports 80 and 443 are exposed externally via the Traefik Ingress controller.
- **Database Port Isolation**: PostgreSQL port `5432` is configured strictly as a Kubernetes `ClusterIP` service (`10.43.155.220`). It is completely unroutable from the public internet and accessible only to pods within the `lostlink` namespace matching the labels `app: lostlink-web` or `app: lostlink-worker`.

### 3.2 Kubernetes Secrets & Credential Protection
- All production database credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`), `NEXTAUTH_SECRET`, and object storage tokens are stored in Kubernetes `Secret` objects (`lostlink-secrets`).
- Pods consume secrets as container environment variables injected at runtime; zero credentials or API keys are committed to Git.

### 3.3 Container Hardening (Non-Root UID 1001)
- In accordance with CIS Kubernetes Benchmark guidelines, the web and worker containers execute under a dedicated unprivileged user `nextjs` (UID `1001`, GID `1001`).
- Root privileges and sudo access are eliminated from container runtime images.

---

## 4. Handover Protection & Anti-Impostor State Machine
- When a claim is approved by a moderator, a single-use 6-digit cryptographic OTP is generated and linked to the claim record.
- The physical handover requires entering this OTP at the campus security desk.
- Once entered, the challenge is immediately invalidated (`consumed = true`) and the item transitions to `RETURNED`. Any subsequent attempt to reuse the OTP is rejected, preventing duplicate or unauthorized handovers.

