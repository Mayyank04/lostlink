# LostLink 2.0 — Institutional College Onboarding Guide

> **Audience:** College Deans, Campus Security Directors, Lost & Found Coordinators, Platform Super Admins  
> **Objective:** Seamless multi-tenant college onboarding without application downtime or code deployments  

---

## 1. Onboarding Pathways

An institution can be onboarded into the LostLink 2.0 federation through two sanctioned pathways:

### Pathway A: Direct Super Admin Onboarding (Fast-Track)
1. Super Admin logs into `/platform-admin` and selects **2. Manage Colleges**.
2. Clicks **+ Add College**.
3. Enters official institution parameters:
   - **College Name:** e.g. *Massachusetts Institute of Technology*
   - **Tenant Slug:** e.g. `mit` (must be unique, lowercase, URL-safe)
   - **Email Domains:** Comma-separated list of student email domains, e.g. `mit.edu, alum.mit.edu, csail.mit.edu`
   - **City / State:** Physical headquarters of the campus
   - **Initial Campus Name:** e.g. `Main Campus`
   - **Primary Return Desk:** e.g. `Student Center Desk (W20)`
   - **Initial College Administrator:** Email and full name of designated coordinator.
4. Clicks **Provision Institution Tenant**.
   - *Result:* An atomic transaction provisions the college, creates the campus hierarchy, assigns the default security return desk, and issues administrator credentials.

### Pathway B: Self-Service Institutional Application
1. University representatives navigate to the public application endpoint:
   - `POST /api/platform-admin/applications`
2. Submits institution name, website, official contact email, student domain, and estimated student count.
3. The request enters the **College Applications** queue in `/platform-admin`.
4. Super Admin reviews the request and clicks **Approve & Provision**.

---

## 2. Institutional Email Domain Configuration

LostLink 2.0 uses zero-knowledge institutional email domain matching to automatically verify student enrollments:

- **Primary Domain:** e.g. `apex.edu`
- **Subdomains:** e.g. `eng.apex.edu`, `law.apex.edu`, `med.apex.edu`
- **Behavior:**
  - When a student registers with `@apex.edu`, their membership in that college is instantly set to `VERIFIED`.
  - If a student registers with an external email (e.g. `@gmail.com`), their membership is flagged as `PENDING` and requires physical student ID card verification at the campus lost & found desk before full recovery privileges are granted.

---

## 3. Physical Return Desks & Campus Setup

Items found on campus are typically turned in to designated security desks, department offices, or library service centers.

### Adding Campuses and Desks via `/college-admin`
1. Navigate to `/college-admin` and select the **Campuses & Desks** tab.
2. Click **+ Add Campus** to register satellite campuses (e.g., North Medical Campus, Downtown Center).
3. Click **+ Add Location** to register drop-off points within a campus:
   - **Location Name:** e.g., *Science Library Circulation Desk*
   - **Building:** *Hayden Memorial Building*
   - **Floor / Room:** *1st Floor, Room 102*
   - **Has Physical Return Desk:** Checked

---

## 4. Managing Item Returns via 6-Digit OTP Verification

When a student's ownership claim is approved, LostLink provides a cryptographically secure, fraud-proof in-person handover mechanism:

1. **Claimant View:** The verified owner sees a secure **6-digit One-Time Password (OTP)** on their student dashboard.
2. **In-Person Exchange:** The claimant visits the campus lost & found desk and presents their student ID along with the 6-digit OTP code.
3. **Desk Verification:** The College Administrator clicks **Verify Return OTP** in `/college-admin`:
   - Enters the 6-digit code.
   - Clicks **Confirm Return**.
4. **Instant Database Settlement:**
   - The Handover Challenge is transitioned to `CONFIRMED`.
   - The Claim is transitioned to `RETURNED`.
   - The Item is transitioned to `RETURNED`.
   - An immutable entry is written to the audit log with the confirming officer's identity.
