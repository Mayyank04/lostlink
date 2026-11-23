# Authentication Architecture

## Overview
LostLink 2.0 uses a secure, session-based authentication system backed by PostgreSQL and encrypted HTTP-only cookies. No third-party paid authentication services or client-side trust assumptions are used.

---

## 1. Password Hashing with Argon2id
- User passwords are never stored in plaintext.
- Hashing is performed using **Argon2id**, the winner of the Password Hashing Competition (PHC) and OWASP-recommended standard.
- Salt is generated cryptographically using `crypto.randomBytes(16)`.
- Argon2id parameters:
  - Memory: 65,536 KB (64 MB)
  - Iterations: 3
  - Parallelism: 1
  - Key Length: 32 bytes

---

## 2. Session Management
- **Token Generation:** Cryptographically random 32-byte tokens generated via `crypto.randomBytes(32).toString('hex')`.
- **Session Table:** Tokens are stored in the PostgreSQL `Session` table linked to `userId` with an explicit `expiresAt` timestamp (default: 7 days).
- **Cookie Security:**
  - Name: `lostlink_session`
  - Flags: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (in production).
  - Client-side scripts cannot access or tamper with session cookies.

---

## 3. Registration & University Domain Verification
- Students register using their official institution email address (e.g. `student@galgotiasuniversity.edu.in`).
- The system extracts the email domain and validates it against the active `emailDomains` configured for the selected university.
- A 6-digit verification code is generated, hashed, and sent to the student's email.
- The `CollegeMembership` is marked `VERIFIED` only after successful OTP confirmation.

---

## 4. Password Reset & Invalidation
- Reset requests generate a cryptographically random token.
- The token is hashed with **SHA-256** before storage in `PasswordResetToken` (expires in 15 minutes).
- Resetting a password immediately invalidates:
  1. The password reset token.
  2. All active user sessions across all devices (`prisma.session.deleteMany({ where: { userId } })`).
- Changing user roles or suspending a user account immediately terminates all active sessions.
