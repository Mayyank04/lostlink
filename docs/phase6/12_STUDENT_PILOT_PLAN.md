# LostLink 2.0 — Real Student Pilot Deployment Plan & Rollout Strategy

## 1. Executive Summary
This document specifies the operational plan for launching the real-world student pilot of **LostLink 2.0** across three partner university campuses over a 4-week validation period.

---

## 2. Participating Pilot Institutions & Stakeholders

| College Identifier | Institution Name | Primary Pilot Location | Key Stakeholder Group |
|---|---|---|---|
| `college-apex` | Apex University of Science & Technology | Central Science Library & Engineering Hub | Student Council & Library Front Desk Staff |
| `college-horizon` | Horizon State University | Student Union Building & Athletic Center | Student Affairs & Lost & Found Coordinators |
| `college-metro` | Metro Community College | Campus Transit Center & Main Cafeteria | Campus Security Officers |

---

## 3. Four-Week Staged Rollout Timeline

### Week 1: Staff & Moderator Onboarding
- Provision Moderator accounts for campus security officers and library staff.
- Conduct live handover drills using test items and OTP/QR code scanning.
- Deploy and verify private edge worker daemons on campus lab computers.

### Week 2: Soft Launch (Campus Library Focus)
- Deploy physical QR code posters at campus library entrances: *"Lost an item in the library? Check LostLink 2.0"*.
- Student login restricted to official `.edu` institutional email addresses.
- Monitor real-time logs for registration drop-offs or form submission friction.

### Week 3: Full Campus Expansion
- Broadcast announcement email through Student Affairs newsletters.
- Enable cross-campus reporting for students taking inter-college courses.
- Daily monitoring of matching precision and claim resolution times.

### Week 4: Pilot Evaluation & Academic Review
- Conduct feedback surveys among students who completed successful recoveries.
- Tally Key Performance Indicators (KPIs) for PBL viva and academic submission.

---

## 4. Key Performance Indicators (Success Criteria)

| Pilot Success Metric | Target Threshold | Method of Measurement |
|---|---|---|
| **Student Registration** | $> 500$ students | PostgreSQL User count |
| **Lost/Found Reports Filed** | $> 100$ items | Items table count |
| **Successful Recoveries** | $\ge 40\%$ return rate | Claims with status `RETURNED` |
| **Average Return Turnaround** | $< 48\text{ hours}$ | Timestamp delta between report and handover |
| **Platform Uptime** | $\ge 99.9\%$ | Kubernetes uptime probe metrics |
| **User Satisfaction** | $\ge 4.5 / 5.0$ | Post-return student in-app rating |

---

## 5. Risk Management & Escalation Plan
- **Duplicate/Spam Reports**: Automated rate-limiting and moderator one-click dismissal.
- **Physical Safety Concerns**: Handover guidelines enforce daylight meetings at authorized campus security counters.
- **Lost Item Disagreements**: Serial numbers and private evidence review remain final authority under campus moderator discretion.
