# Data Flow & Lifecycle Architecture

## 1. Lost & Found Reporting Flow

```
[Student / Finder]
        |
        v
[MultiStepReportForm (UI)]
        |
        v (Client API: items.client.ts)
[POST /api/items]
        |
        v (Session & Tenant Verification)
[itemService.createReport]
        |
        +---> [Prisma Transaction]
        |        |--> Item record inserted with reference number (LL-YYYY-XXXX / FD-YYYY-XXXX)
        |        |--> Images uploaded to object storage and recorded in ItemImage
        |        |--> Private evidence encrypted via AES-256-GCM and stored
        |        +--> AuditLog entry recorded
        |
        +---> [Trigger Matching Engine]
                 |--> Calculate match scores against opposite-type items
                 +--> If score >= 40, create Match record & notify loser
```

---

## 2. Claim Submission & Moderation Flow

```
[Claimant (Student)]
        |
        v
[POST /api/claims]
        |
        v
[claimService.submitClaim]
        |
        +---> Validates:
        |        |--> Anti-self-claim check (claimant != finder)
        |        |--> Item status eligibility (item != RETURNED && item != CLOSED)
        |        |--> Duplicate active claim check
        |        +--> College tenant membership check
        |
        +---> [Prisma Transaction]
                 |--> Claim record created (CLM-YYYY-XXXX)
                 |--> ClaimStatusHistory initial entry created
                 |--> Item status updated to CLAIM_PENDING
                 |--> In-app notification delivered to Finder
                 |--> Confirmation notification delivered to Claimant
                 +--> AuditLog entry recorded
```

---

## 3. Handover Verification & Atomic Return Flow

```
[Finder or Custody Officer]
        |
        v
[POST /api/handovers]
        |
        v
[handoverService.initiateHandover]
        |
        +---> Generates 6-digit random OTP
        +---> Stores SHA-256(OTP) in HandoverChallenge (with expiration)
        +---> Shares plain OTP exclusively with Claimant
        |
[Physical Handover at Campus Office]
        |
        v
[Claimant presents OTP to Custodian / Finder]
        |
        v
[POST /api/handovers/[id]/confirm]
        |
        v
[handoverService.confirmHandover]
        |
        +---> Verifies SHA-256(InputOTP) matches stored codeHash
        +---> Verifies challenge is not expired
        |
        +---> [Atomic Prisma Transaction]
                 |--> HandoverChallenge status -> COMPLETED, confirmedAt = now()
                 |--> Claim status -> COMPLETED
                 |--> Item status -> RETURNED
                 |--> Notifications sent to Claimant & Finder
                 +--> AuditLog recorded
```
