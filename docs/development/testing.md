# Automated Testing Guide

## Test Suite Overview

LostLink 2.0 maintains a comprehensive suite of 19 test files with 179 automated tests powered by **Vitest**.

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run a Specific Test Suite
```bash
npx vitest run src/tests/claims.test.ts
npx vitest run src/tests/security-master-repair.test.ts
```

---

## Test Categories

1. **Unit Tests:**
   - `src/lib/matching/engine.test.ts`: Deterministic matching engine scoring algorithm.
2. **Integration Tests:**
   - `src/tests/auth.test.ts`, `admin-onboarding-auth.test.ts`: Registration, login, and tenant boundaries.
   - `src/tests/claims.test.ts`, `handover.test.ts`: Verification claims and OTP confirmation.
   - `src/tests/college-finder-search.test.ts`: Search, geo-filters, and pagination.
3. **End-to-End Recovery Life Cycle:**
   - `src/tests/e2e-recovery.test.ts`: 11-step lifecycle from lost report to match, claim, officer review, OTP handover, and database status resolution.
4. **Security & OWASP Verification:**
   - `src/tests/security-owasp.test.ts`: SQL injection, timing-safe checks, XSS sanitization.
   - `src/tests/security-master-repair.test.ts`: Multi-tenant privilege escalation prevention and session termination.
