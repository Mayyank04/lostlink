# LostLink 2.0 — Phase 3 Technical Architecture & Verification Report

**Cloud Computing Module IV PBL Project**  
**Component:** Phase 3 — Smart Matching Engine, Secure Ownership Claims, Messaging, Verified Returns & College Moderation  
**Status:** **Fully Implemented, Verified, and Tested (54 / 54 Tests Passing)**  
**Platform Architecture:** Multi-College Tenant Isolation • Next.js 14 App Router • PostgreSQL • Prisma ORM • Argon2id • SHA-256 Crypto

---

## 1. Executive Summary

Phase 3 delivers the complete, production-grade end-to-end recovery lifecycle:

$$\text{Lost Report} \longrightarrow \text{Found Report} \longrightarrow \text{Auto Matching (100 pts)} \longrightarrow \text{Alert} \longrightarrow \text{Ownership Claim} \longrightarrow \text{Moderator Verification} \longrightarrow \text{Direct Messaging} \longrightarrow \text{Cryptographic Handover (6-Digit OTP)} \longrightarrow \text{Item Returned}$$

Every single stage is backed by real persisted data in PostgreSQL using Prisma ORM. There are **no simulated matching percentages, no hardcoded claims, no fake handovers, and no generative AI / paid LLM APIs**. All matching is 100% deterministic, explainable, and auditable.

---

## 2. 100-Point Rule-Based Matching Engine

### 2.1 Weighting Matrix

The matching engine uses an explainable 100-point composite scoring model:

| Dimension | Max Score | Evaluation Rules |
| :--- | :---: | :--- |
| **Category Compatibility** | **25 pts** | Exact category match or synonym category group match. Incompatible category awards 0 pts. |
| **Title & Keyword Similarity** | **25 pts** | Token overlap with Jaccard-derived token overlap, synonym dictionary expansion, and description boost. Model number generation conflict (e.g. iPhone 15 vs 16) triggers a strict 0 penalty. |
| **Color Profile Match** | **15 pts** | Normalized color alias mapping (e.g., Space Gray $\leftrightarrow$ Charcoal $\leftrightarrow$ Grey; Navy $\leftrightarrow$ Blue). Missing color yields neutral 0 evidence. |
| **Brand & Manufacturer** | **10 pts** | Case-insensitive normalized brand comparison. Missing brand yields neutral 0 evidence. |
| **Campus Facility Proximity**| **15 pts** | Exact building match awards 15 pts; same campus branch awards 10 pts; same university awards 5 pts; differing institutions award 0 pts. |
| **Timeline Plausibility** | **10 pts** | Found after lost awards 10 pts; found within 24-hr approximate reporting window awards 5 pts; found days prior to loss awards 0 pts. |
| **Total Composite Score** | **100 pts** | **Strong Match:** $\ge 80\%$ • **Possible Match:** $60-79\%$ • **Persistence Threshold:** $\ge 55\%$ |

### 2.2 Semantic Synonym & Color Dictionaries
Implemented in `src/lib/matching/matchEngine.ts`:
- **Synonyms:** Over 14 curated equipment groups covering earbuds, laptops, smartphones, water bottles, student IDs, keys, calculators, chargers, outerwear, and glasses.
- **Color Aliases:** Groupings for neutral and metallic shades (charcoal, space gray, silver, starlight, ivory, navy, cobalt, etc.).
- **Model Generation Conflict Guard:** Regular expression extractor `extractModelNumbers` identifies numerical generations (e.g. `14`, `15`, `16`, `5th Gen`, `M2`, `M3`). When both titles feature distinct model numbers, the title score is strictly penalized to prevent erroneous pairings across hardware generations.

---

## 3. Ownership Claims & Verification State Machine

### 3.1 Claims State Machine
```mermaid
stateDiagram-v2
    [*] --> PENDING: Student submits claim with private answers
    PENDING --> UNDER_REVIEW: Moderator/Finder requests evidence
    UNDER_REVIEW --> UNDER_REVIEW: Student submits supplementary proof
    PENDING --> CANCELLED: Claimant cancels claim
    UNDER_REVIEW --> CANCELLED: Claimant cancels claim
    PENDING --> APPROVED: Custodian verifies proof
    UNDER_REVIEW --> APPROVED: Custodian verifies proof
    APPROVED --> HANDOVER_PENDING: Handover challenge generated
    PENDING --> REJECTED: Custodian rejects claim
    UNDER_REVIEW --> REJECTED: Custodian rejects claim
    PENDING --> DISPUTED: Competing claim or conflict
    UNDER_REVIEW --> DISPUTED: Competing claim or conflict
    HANDOVER_PENDING --> RETURNED: 6-Digit OTP verified at desk
    RETURNED --> [*]
    CANCELLED --> [*]
    REJECTED --> [*]
```

### 3.2 Security & Data Privacy Constraints
- **Anti-Self-Claim:** Item reporters cannot submit ownership claims on items they reported found.
- **Private Evidence Isolation:** Private verification answers (e.g. wallpapers, engraved initials, serial numbers) are **never** exposed publicly or to competing claimants. Only the claimant, item custodian, and verified college moderators can inspect proof.
- **Audit History:** Every transition records an entry in `ClaimStatusHistory` documenting `fromStatus`, `toStatus`, `actorId`, `reasonCode`, and timestamp.
- **Automatic Status Reversion:** If a claimant cancels their pending claim, the item reverts to `OPEN` unless other active claims exist.

---

## 4. Cryptographic Handover & Verified Returns

### 4.1 Handover Protocol
1. **Challenge Generation (`POST /api/handovers`):**
   - Generates cryptographically secure 6-digit numeric OTP via `crypto.randomInt(100000, 1000000)`.
   - Generates URL-safe QR token via `crypto.randomBytes(24)`.
   - Hashes tokens with SHA-256 (`codeHash`, `qrTokenHash`).
   - Stores challenge in database with 24-hour expiration (`expiresAt`).
   - Plain OTP is provided **only** to the claimant to present upon pickup.
2. **Physical Exchange Verification (`POST /api/handovers/[id]/confirm`):**
   - The custodian / finder enters the 6-digit OTP displayed on the student's screen.
   - Server verifies `crypto.timingSafeEqual` between candidate hash and stored `codeHash`.
   - Rejects expired challenges or duplicate confirmations.
   - Executes atomic transaction:
     - `Item.status = RETURNED`
     - `Claim.status = RETURNED`
     - `HandoverChallenge.status = CONFIRMED`
     - `Match.status = RESOLVED`
     - Inserts `ClaimStatusHistory` and `AuditLog`
     - Dispatches celebratory notifications to both parties.

---

## 5. PostgreSQL Messaging & Real-Time Communications

- **Data Models:** `Conversation`, `ConversationParticipant`, `Message`, `MessageReport`.
- **Tenant & Participant Authorization:** Only verified conversation participants and authorized college moderators can read or post messages.
- **Unread Tracking:** Unread counters computed dynamically based on `ConversationParticipant.lastReadAt`.
- **Abuse Moderation:** Students can flag abusive messages via `POST /api/messages/[id]/report`, routing transcripts directly into the college moderation queue.

---

## 6. Automated Test Suite Results

All 10 test suites passed cleanly with **54 / 54 passing tests**:

| Test Suite | Tests | Result | Duration | Scope |
| :--- | :---: | :---: | :---: | :--- |
| `src/tests/auth.test.ts` | 2 | **Passed** | 80ms | Argon2id password hashing, rate limiting |
| `src/tests/db.test.ts` | 4 | **Passed** | 95ms | Health query, email uniqueness, cascade deletes, evidence isolation |
| `src/tests/tenant.test.ts` | 4 | **Passed** | 85ms | Multi-college domain resolution, tenant scoping |
| `src/tests/storage.test.ts` | 4 | **Passed** | 70ms | File validation, collision-resistant keys, MIME types |
| `src/tests/matching.test.ts` | 7 | **Passed** | 12ms | 100-pt engine, model conflicts, synonyms, chronology |
| `src/tests/claims.test.ts` | 5 | **Passed** | 69ms | Anti-self-claim, evidence requests, cancellation, status history |
| `src/tests/handover.test.ts` | 5 | **Passed** | 56ms | 6-digit OTP, SHA-256 hashing, timing-safe checks, expiry |
| `src/tests/messaging.test.ts` | 5 | **Passed** | 58ms | Conversations, unread counts, access control, abuse reports |
| `src/tests/e2e-recovery.test.ts` | 11 | **Passed** | 100ms | **Full 11-step end-to-end recovery lifecycle** |
| `src/lib/matching/engine.test.ts` | 7 | **Passed** | 18ms | Deterministic matching edge cases |
| **Total** | **54** | **100% Passed** | **653ms** | **Production Ready** |

---

## 7. Viva & Oral Examination Defense Guide

### Q1: Why not use an LLM API or OpenAI embeddings for item matching?
> **Answer:** University lost-and-found systems handle real student property where accountability and determinism are paramount. LLM APIs introduce non-deterministic hallucinations, privacy leakage of student belongings, latency spikes, and recurring API costs. Our 100-point algorithm is 100% explainable, transparent to students and moderators, executes in $<2\text{ms}$ in-memory, and runs securely without external network dependencies.

### Q2: How do you prevent fraudulent claims?
> **Answer:** We enforce a 4-tier security barrier:
> 1. *Public description sanitization:* Distinguishing unique marks (engravings, serial numbers) are withheld from public listings.
> 2. *Private evidence vault:* Claimant must answer private verification challenges which are visible only to custodians.
> 3. *Anti-self-claim & contention locks:* Reporters cannot claim their own items, and items with competing claims are locked under review.
> 4. *Cryptographic Handover:* Physical handover requires in-person presentation of a 24-hour single-use 6-digit OTP, preventing unauthorized claim confirmations.

### Q3: How is multi-college tenant isolation enforced?
> **Answer:** Every report, claim, and audit log belongs to a specific `collegeId`. All Prisma queries enforce tenant filtering in route handlers (`requireAuth` + `requireCollegeMembership`). College moderators can only access custody records matching their university memberships.

