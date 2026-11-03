# LOSTLINK 2.0 — 5-TO-7 MINUTE LIVE DEMONSTRATION SCRIPT
## Step-by-Step Viva & Project Evaluation Walkthrough

---

### DEMO OVERVIEW & SETUP
- **Target URL**: `http://localhost:8080` (Kubernetes Cluster via Traefik Ingress)
- **Estimated Duration**: Exactly 5 to 7 minutes
- **Hardware/Browser**: Laptop with Chrome/Firefox open to `http://localhost:8080`
- **Demo Seed Credentials**:
  - **Student A (Reporter / Claimant)**: `alex.student@apex.edu` (Password: `Password123!`)
  - **Student B (Finder)**: `maya.chen@apex.edu` (Password: `Password123!`)
  - **College Moderator (Security Desk)**: `sarah.admin@apex.edu` (Password: `Password123!`)

---

### MINUTE 1: INTRODUCTION & CLUSTER HEALTH (0:00 – 1:00)

**What to Click / Show:**
1. Open terminal and run:
   ```bash
   ./scripts/check-public-health.sh http://localhost:8080
   ```
2. Point out the terminal output:
   - Liveness probe: OK (200)
   - Readiness probe: OK (200), latency 1ms, database connected
   - Hybrid Worker Status: OK (200), 2 registered workers.
3. Show the Kubernetes pods:
   ```bash
   kubectl get pods -n lostlink
   ```

**What to Say:**
> *"Respected evaluators, before demonstrating the user flow, I want to show that LostLink 2.0 is actively running live on our Kubernetes cluster. Here is our automated health probe hitting our Traefik ingress at port 8080. All pods—including our two web replicas, our background worker daemon, and our PostgreSQL StatefulSet—are healthy. Our hybrid worker status confirms that our campus edge node and public fallback worker are both actively connected."*

---

### MINUTE 2: STUDENT A REPORTS A LOST ITEM (1:00 – 2:00)

**What to Click / Show:**
1. Open browser tab to `http://localhost:8080/login`.
2. Sign in as Student A (`alex.student@apex.edu` / `Password123!`).
3. Click **"Report Lost Item"** button.
4. Fill in the form:
   - **Title**: `Sony WH-1000XM5 Wireless Headphones`
   - **Category**: `Electronics`
   - **College / Campus**: `Apex University of Science & Technology` -> `Main Science Campus`
   - **Primary Location**: `Science Library - 2nd Floor Study Room`
   - **Date Lost**: Select yesterday's date
   - **Private Evidence**: Enter `Serial: SONY-984210; small scratch on left ear cup; sticker of Python logo on case.`
5. Click **"Submit Report"**.

**What to Say:**
> *"Now I am signed in as Alex, a student at Apex University. Alex left his Sony wireless headphones in the campus library. Notice our 3-step wizard. Crucially, Alex inputs his serial number and distinctive marks into the 'Private Evidence' field. As per our zero-trust architecture, this sensitive evidence is cryptographically segregated and never shown on public browsing pages."*

---

### MINUTE 3: STUDENT B REPORTS FINDING THE ITEM (2:00 – 3:15)

**What to Click / Show:**
1. Open an Incognito Window or separate browser profile at `http://localhost:8080/login`.
2. Sign in as Student B (`maya.chen@apex.edu` / `Password123!`).
3. Click **"Report Found Item"**.
4. Fill in:
   - **Title**: `Found Black Sony Headphones`
   - **Category**: `Electronics`
   - **Campus / Location**: `Main Science Campus` -> `Science Library - 2nd Floor`
   - **Description**: `Found on study table in room 204. Handed to library front desk.`
5. Click **"Submit Report"**.

**What to Say:**
> *"In another browser session, Maya, who works at the library, finds the headphones. She reports them as a Found Item. As soon as Maya hits Submit, our central PostgreSQL queue creates a MatchingJob record. In the background, our campus edge worker leases the job, runs our 100-point deterministic algorithm, and calculates an 90-point match based on identical category, library location, and temporal proximity."*

---

### MINUTE 4: MATCH NOTIFICATION & PRIVATE EVIDENCE CLAIM (3:15 – 4:30)

**What to Click / Show:**
1. Switch back to Student A's (Alex) window.
2. Refresh or click the **Notification Bell** icon in the header.
3. Point out the new notification: *"Potential Match Found: Black Sony Headphones (90% Match Score)"*.
4. Click **"View Match & Submit Claim"**.
5. Show the Match Breakdown card (Category: 40/40, Location: 30/30, Date: 15/20, Keywords: 5/10).
6. Click **"File Ownership Claim"** and confirm submission of private evidence.

**What to Say:**
> *"Alex immediately receives an automatic match notification. Notice the explainable match score breakdown—there is no black-box AI hallucination here. Alex sees that the item is held safely at the Library Front Desk. He clicks 'File Ownership Claim', submitting his private serial number evidence directly to the college moderator for verification."*

---

### MINUTE 5: MODERATOR REVIEW & EVIDENCE VERIFICATION (4:30 – 5:30)

**What to Click / Show:**
1. Open a new tab and sign in as Moderator (`sarah.admin@apex.edu` / `Password123!`).
2. Navigate to the **Moderator Dashboard** (`/admin` or `/moderator`).
3. Show the **Pending Claims** table.
4. Click on Alex's claim for the Sony Headphones.
5. Show the split-screen comparison:
   - Found Report details submitted by Maya.
   - Private evidence submitted by Alex: `Serial: SONY-984210; Python sticker on case`.
6. Click **"Approve Claim"**.

**What to Say:**
> *"Now I am logged in as Sarah, the campus security officer and college moderator. In Sarah's portal, she has access to the blind evidence. She checks the actual headphones held in the physical locker against Alex's stated serial number and Python sticker. Because they match, Sarah clicks 'Approve Claim'. The claim status transitions to APPROVED."*

---

### MINUTE 6: SECURE MESSAGING & ONE-TIME OTP HANDOVER (5:30 – 6:30)

**What to Click / Show:**
1. Switch back to Student A's (Alex) window.
2. The claim banner now displays: *"Claim Approved! Visit Library Front Desk to Collect"*.
3. Show the dynamic **6-digit Handover Code (OTP)** and clickable **QR Code**.
4. In the Moderator portal, navigate to **"Handover Verification"**.
5. Enter the 6-digit OTP displayed on Alex's screen (or scan QR code) and click **"Confirm Handover"**.
6. The item and claim status instantly update to **`RETURNED`**.

**What to Say:**
> *"Once approved, an in-app messaging channel opens and a cryptographic 6-digit OTP and QR code are minted for Alex. When Alex arrives at the desk, the moderator enters this one-time code to authorize the handover. Neither party had to disclose their personal phone number or home address. The item is officially marked as RETURNED in the database, updating campus analytics."*

---

### MINUTE 7: HYBRID FAILOVER VERIFICATION & CONCLUSION (6:30 – 7:00)

**What to Click / Show:**
1. Switch back to the terminal and execute:
   ```bash
   ./scripts/restore-test.sh
   ```
2. Point out the sub-2-second sandbox restoration and record verification.
3. Conclude the demonstration.

**What to Say:**
> *"Finally, to verify operational reliability and disaster recovery, here is our automated restore drill verifying full database restoration in 1.2 seconds. LostLink 2.0 delivers an end-to-end, privacy-first recovery pipeline on Kubernetes with hybrid edge computing and 97% cloud cost optimization. Thank you!"*

