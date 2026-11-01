# LostLink 2.0 — Student Privacy, Trust, Safety & Regulatory Review

## 1. Executive Summary & Regulatory Framework
As a university-centric platform managing personal student belongings and identification, **LostLink 2.0** incorporates rigorous privacy and student safety architectures designed in compliance with the **Digital Personal Data Protection Act (DPDP Act 2023)**, **FERPA** principles, and university safety codes.

---

## 2. Privacy by Design: PII Separation Architecture

```
PUBLIC DISCOVERY TIER (Non-PII)
+---------------------------------------------------------------------------------+
| Title: "Black Wireless Earbuds"                                                 |
| Category: ELECTRONICS | Location: Main Library 2nd Floor | Date: Yesterday      |
| Public Photo: Blurred / generic exterior                                        |
+---------------------------------------------------------------------------------+
                                      |
                                      v [Claim Submitted]
PRIVATE VERIFICATION TIER (Strictly Scoped Access)
+---------------------------------------------------------------------------------+
| Owner Evidence: Serial Number (A2084...), engraving text "Maya", custom case    |
| Access Control: Visible ONLY to verified Reporter & College Moderator           |
| Cryptographic Storage: Encrypted in DB / PrivateItemEvidence table              |
+---------------------------------------------------------------------------------+
                                      |
                                      v [Moderator Approves]
HANDOVER & RESOLUTION TIER (Ephemeral / Anonymized)
+---------------------------------------------------------------------------------+
| Communications: In-app secure messaging (Zero personal phone/WhatsApp leakage)  |
| Handover Code: 6-digit cryptographic OTP / QR Code generated at handover        |
| Physical Location: Designated Campus Security / Student Affairs Desk            |
+---------------------------------------------------------------------------------+
```

---

## 3. Compliance with DPDP Act 2023 & Student Data Rights

| DPDP Principle | Implementation in LostLink 2.0 |
|---|---|
| **Purpose Limitation** | Student data collected is strictly limited to facilitating lost-and-found recovery; never sold or monetized. |
| **Data Minimization** | Student registration only collects institutional email (`.edu`), full name, and hashed password. No GPS tracking or real-time location streaming. |
| **Right to Erasure (De-registration)** | Students can retract reports and delete accounts, triggering immediate cascade deletion of sessions and anonymization of public reports. |
| **Data Security Safeguards** | All credentials hashed via Argon2id with unique salts; Session tokens stored in HTTP-only, SameSite=Strict cookies; AES-256 for private evidence. |
| **Consent & Transparency** | Explicit consent checkboxes prior to submitting private item evidence, explaining who can view the information. |

---

## 4. Student Safety & Anti-Harassment Safeguards
1. **No Direct Personal Contact Sharing**: Students are never required to share personal phone numbers, Instagram handles, or dorm room numbers. All communication takes place inside LostLink's moderated messaging relay.
2. **Designated Campus Safety Handover Points**: The platform UI actively recommends verified campus locations (e.g. Campus Security Desk, Library Front Counter, Dean of Students Office) rather than secluded areas.
3. **Cryptographic OTP Handover Verification**: Handover requires the finder to enter a 6-digit single-use OTP or scan a dynamic QR code generated on the claimant's phone, preventing unauthorized third-party claims.
4. **Moderator Audit Trails**: Every approval, rejection, and claim review is logged with timestamps, IP addresses, and moderator IDs in the `AuditLog` table for accountability.
