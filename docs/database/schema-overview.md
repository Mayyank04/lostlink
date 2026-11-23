# Database Schema Overview

The database is built on **PostgreSQL 16** managed via **Prisma ORM**.

## Entity Relationship Overview

```
[College] <1---M> [Campus] <1---M> [Location]
    ^
    | (1---M)
    +-----------------+-------------------+
    |                 |                   |
[CollegeMembership]  [Item]             [AuditLog]
    |                 ^
    | (M---1)         | (1---M)
 [User] <1---M>     [Claim] <1---1> [HandoverChallenge]
    |                 |
    | (1---M)         | (1---M)
 [Session]       [ClaimStatusHistory]
```

---

## Core Models

### `User`
- Central identity entity representing students, campus administrators, and platform administrators.
- Fields: `id`, `name`, `email` (unique), `passwordHash`, `role` (`STUDENT`, `COLLEGE_ADMIN`, `COLLEGE_MODERATOR`, `PLATFORM_ADMIN`), `status` (`ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`).

### `College`
- Logical tenant boundary representing a university.
- Fields: `id`, `name`, `slug` (unique), `shortName`, `emailDomains` (`String[]`), `status` (`ACTIVE`, `PENDING_REVIEW`, `SUSPENDED`, `ARCHIVED`), `domainVerificationStatus`.

### `Item`
- Represents a lost or found report.
- Fields: `id`, `reportNumber` (unique), `type` (`LOST`, `FOUND`), `name`, `category`, `brand`, `color`, `description`, `occurredAt`, `locationBuilding`, `collegeId`, `campusId`, `reporterId`, `status` (`OPEN`, `CLAIM_PENDING`, `RETURNED`, `CLOSED`).

### `Claim`
- Verification claim submitted by a student claiming ownership of a found item.
- Fields: `id`, `referenceNumber` (unique), `itemId`, `claimantId`, `status` (`PENDING`, `UNDER_REVIEW`, `APPROVED`, `HANDOVER_PENDING`, `COMPLETED`, `REJECTED`, `CANCELLED`, `DISPUTED`), `additionalProofNotes`, `privateEvidenceReference`.

### `HandoverChallenge`
- Physical exchange verification token.
- Fields: `id`, `claimId` (unique), `codeHash` (SHA-256 of 6-digit OTP), `status` (`PENDING`, `COMPLETED`, `EXPIRED`, `CANCELLED`), `expiresAt`, `confirmedAt`, `confirmedByUserId`.

### `AuditLog`
- Immutable system audit trail.
- Fields: `id`, `collegeId` (optional), `actorId` (optional), `action`, `resourceType`, `resourceId`, `metadata` (JSON), `createdAt`.
