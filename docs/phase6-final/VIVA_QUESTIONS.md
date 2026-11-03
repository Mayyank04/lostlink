# LOSTLINK 2.0 — COMPREHENSIVE VIVA VOCE QUESTIONS & ANSWERS
## 40+ Beginner-Friendly & Technical Viva Questions Across 6 Core Engineering Categories

---

### CATEGORY 1: GENERAL PROJECT & ARCHITECTURE OVERVIEW

#### Q1: What is LostLink 2.0, and what specific problem does it solve?
**Answer**: LostLink 2.0 is a smart, multi-college lost-and-found web platform engineered for university campuses. Today, students rely on informal WhatsApp groups or manual paper logs at security desks, leading to lost belongings being unrecovered, personal phone numbers being leaked publicly, and false claims. LostLink 2.0 automates the entire recovery lifecycle: Lost Report $\to$ Found Report $\to$ 100-Point Deterministic Rule Matching $\to$ Instant Notification $\to$ Blind Private Ownership Claim $\to$ Moderator Review $\to$ Secure In-App Messaging $\to$ OTP/QR-Verified Physical Handover.

#### Q2: What is the official Cloud Computing Module IV PBL requirement for this project?
**Answer**: The official assignment requirement is: *"Build end-to-end cloud projects: design a scalable web app using containers/Kubernetes, deploy on hybrid cloud, and optimize costs."* LostLink 2.0 fulfills all four pillars: full-stack Next.js/PostgreSQL application, Docker containerization, Kubernetes (k3s) orchestration with HPA, a hybrid-cloud architecture partitioning cloud control plane and on-premises campus edge nodes, and a 97.1% cost optimization model.

#### Q3: What is the core technology stack used in LostLink 2.0?
**Answer**:
- **Frontend**: Next.js 15 (App Router), React Server Components (RSC), TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: Next.js Route Handlers (Edge & Node.js runtimes), Zod schema validation.
- **Database**: PostgreSQL 16 managed via Prisma ORM with compound B-Tree indexes.
- **Authentication**: Argon2id password hashing, JWT encrypted sessions, HTTP-only SameSite cookies.
- **Containerization & Orchestration**: Docker, CNCF-certified k3s Kubernetes, Traefik Ingress.
- **Benchmarking & Load Testing**: Grafana k6 v0.57.0 containerized runtime.

#### Q4: Why did you choose Next.js 15 App Router instead of a separate React SPA and Express.js backend?
**Answer**: Next.js 15 App Router provides React Server Components (RSC), which render initial pages server-side and stream HTML directly to students' mobile browsers. This reduces client-side JavaScript bundle sizes by ~60%, dramatically improving load times on slow campus Wi-Fi networks. Furthermore, maintaining a unified TypeScript codebase ensures shared type definitions between the frontend forms and backend Prisma models, eliminating API schema mismatches.

#### Q5: What is the role of the College Moderator in LostLink 2.0?
**Answer**: In a campus setting, college security officers, library front desk staff, or student council leads act as College Moderators. They review blind private ownership evidence (e.g. comparing the claimant's stated serial number or engraving against the physical item stored in the campus security locker) before approving claims, completely preventing fraudulent impostor claims.

#### Q6: How does LostLink 2.0 handle multi-tenancy across different colleges?
**Answer**: LostLink 2.0 uses database-level logical multi-tenancy. Every `Item`, `User`, `CampusLocation`, and `MatchingJob` record is linked to a specific `collegeId`. Compound indexes like `@@index([collegeId, type, status])` guarantee that database queries remain strictly scoped to the student's authorized college, while cross-college queries are permitted only for authorized search aggregations.

#### Q7: What are the main user roles in the system?
**Answer**:
1. **STUDENT**: Can report lost and found items, view public listings, receive match notifications, submit private ownership claims, chat via secure messaging, and generate handover OTPs.
2. **COLLEGE_MODERATOR**: Scoped to their college. Reviews pending claims, verifies blind evidence, and confirms physical handovers via OTP.
3. **CAMPUS_ADMIN / SUPER_ADMIN**: Manages campus locations, registers campus worker machine keys, and monitors platform health.

---

### CATEGORY 2: CLOUD COMPUTING & KUBERNETES ORCHESTRATION

#### Q8: What is a Container, and why did you use Docker for LostLink 2.0?
**Answer**: A container is a lightweight, standalone, executable package of software that includes everything needed to run an application—code, runtime, system tools, and libraries. We used multi-stage Docker builds to package LostLink 2.0. This guarantees identical runtime behavior across local development machines, staging environments, and production cloud servers, eliminating the classic "it works on my machine" problem.

#### Q9: What is Kubernetes, and what role does it play in this project?
**Answer**: Kubernetes is an open-source container orchestration engine that automates the deployment, scaling, load balancing, and self-healing of containerized applications. In LostLink 2.0, Kubernetes manages our web tier (`lostlink-web`), our background worker daemon (`lostlink-worker`), our PostgreSQL database (`postgres-0`), networking services, and persistent volumes.

#### Q10: What is the difference between a Deployment and a StatefulSet in Kubernetes?
**Answer**:
- A **Deployment** is used for stateless applications (like our `lostlink-web` frontend). Pods are interchangeable, have random network identifiers (e.g. `lostlink-web-89f75fb9b-6xlm5`), and can be stopped, scaled, or replaced without preserving individual state.
- A **StatefulSet** is used for stateful applications (like our `postgres-0` database). Each pod has a sticky, unique, zero-indexed network identity (`postgres-0`) and mounts a dedicated, persistent storage volume (PVC) that persists across pod restarts.

#### Q11: What are Liveness and Readiness Probes in Kubernetes?
**Answer**:
- **Liveness Probe (`/api/health/live`)**: Tells Kubernetes if the application container is still alive. If the Node.js event loop deadlocks or freezes, the liveness probe fails 3 times, and Kubernetes automatically terminates and replaces the container.
- **Readiness Probe (`/api/health/ready`)**: Tells Kubernetes if the pod is ready to accept incoming student traffic. In LostLink, this probe executes a live database query (`SELECT 1`). If the database connection drops, Kubernetes instantly removes the pod from the Ingress routing table so students never see HTTP 500 error pages.

#### Q12: How does Horizontal Pod Autoscaling (HPA) work in LostLink 2.0?
**Answer**: The Kubernetes HPA monitors CPU and memory utilization across the `lostlink-web` deployment. We configured an HPA rule that sets a baseline of 2 replicas and scales up to 5 replicas whenever average CPU utilization crosses 60%. When the load spike subsides (e.g. after a campus rush), HPA gracefully scales the pod count back down to 2 replicas after a stabilization window.

#### Q13: What Ingress Controller is used, and how does it route traffic?
**Answer**: We use Traefik Ingress Controller built into lightweight k3s. Traefik listens on external HTTP/HTTPS ports 80 and 443, terminates SSL/TLS certificates, and routes student requests based on URL paths: `/api/*` routes to backend API endpoints, while `/*` routes to the Next.js server-rendered pages, distributing traffic evenly across web pod replicas.

#### Q14: What is k3s, and why is it preferred over full-blown Kubernetes (k8s) for university deployments?
**Answer**: k3s is a fully CNCF-certified lightweight Kubernetes distribution that packages all Kubernetes control plane components into a single binary consuming less than 512MB of RAM. Standard Kubernetes requires heavy master nodes, etcd clusters, and high cloud overhead. k3s allows university departments to run production-grade Kubernetes workloads on an affordable \$12.50/month Linux VPS or physical campus lab servers.

---

### CATEGORY 3: HYBRID-CLOUD ARCHITECTURE & EDGE COMPUTING

#### Q15: What is a Hybrid Cloud, and how is it implemented in LostLink 2.0?
**Answer**: A hybrid cloud combines public cloud infrastructure with private or on-premises infrastructure, sharing data and workloads between them. In LostLink 2.0, the **Public Cloud Control Plane** runs the 24/7 web interface, API routing, and central PostgreSQL database, while **Private Campus Edge Nodes** (running in university computer labs on existing PCs or Raspberry Pis) lease and execute deterministic matching computations locally, completely eliminating cloud compute bills.

#### Q16: How do private campus edge workers communicate with the public cloud without public IPs?
**Answer**: Private campus workers use **outbound HTTPS long-polling**. The edge worker initiates an outbound request (`POST /api/hybrid/jobs`) to the public cloud ingress. Because the connection is outbound, it passes through campus NAT firewalls without requiring university network administrators to assign public IP addresses or open incoming firewall ports.

#### Q17: How are campus edge workers authenticated?
**Answer**: Campus workers authenticate using mutual machine keys. The worker sends an HTTP header `X-Campus-Worker-Key`. The public cloud server hashes this incoming key using SHA-256 and compares it against stored hashes in the `CampusWorkerKey` database table. The server verifies that the worker is active and authorized specifically for that college's tenant ID.

#### Q18: What happens if an on-premises campus edge worker experiences a power outage or network cut?
**Answer**: LostLink 2.0 implements **Automatic Lease Expiration and Fallback Promotion**:
1. When an edge worker leases a matching job, PostgreSQL records an atomic lease with a 60-second expiration (`leaseExpiresAt = NOW() + 60s`).
2. If the edge worker dies, it fails to send completion or heartbeat signals.
3. Once 60 seconds elapse, the job status automatically reverts from `LEASED` to `QUEUED`.
4. The **Public Cloud Fallback Daemon** (`lostlink-worker` pod in Kubernetes) detects the orphaned job, acquires the lease, and executes the matching routine in the public cloud.
5. In our empirical failover drill, takeover was completed in **62 seconds** with **0% data loss**.

#### Q19: What is "Edge Harvesting" in the context of campus sustainability?
**Answer**: Edge harvesting refers to utilizing the dormant computing capacity of existing physical infrastructure. University computer labs sit empty during late night hours and weekends, yet draw baseline power. Running lightweight LostLink worker daemons on these machines costs \$0.00 in added hardware while offloading hundreds of thousands of matching computations from paid cloud billing meters.

---

### CATEGORY 4: DATABASE & BACKEND ARCHITECTURE

#### Q20: Why did you choose PostgreSQL over a NoSQL database like MongoDB?
**Answer**: Lost-and-found recovery requires strict ACID transactions, complex relational foreign keys, and absolute referential integrity. An ownership claim cannot exist without a valid Item and User; an OTP handover must atomically transition an Item and Claim status in a single database transaction. PostgreSQL guarantees these relational constraints, whereas NoSQL document stores risk orphaned or inconsistent records during network failures.

#### Q21: What is Prisma ORM, and how does it prevent SQL Injection?
**Answer**: Prisma is a type-safe Object-Relational Mapping (ORM) tool for TypeScript and Node.js. Prisma prevents SQL Injection by design: all queries generated by Prisma use 100% parameterized queries. User input is never concatenated into raw SQL strings; instead, database drivers treat input strictly as typed data parameters, rendering classic SQL injection attacks (e.g. `' OR 1=1 --`) mathematically inert.

#### Q22: What database indexing strategies were implemented to achieve sub-20ms response times?
**Answer**: We engineered compound B-Tree indexes tailored to frequent query patterns:
1. `@@index([collegeId, type, status])`: Enables constant-time lookup for filtered catalog searches (e.g. finding all `LOST` and `OPEN` items in `college-apex`) without scanning millions of rows.
2. `@@index([collegeId, createdAt])`: Optimizes chronological sorting for recent campus activity.
3. `@@index([userId])`: Speeds up personal student dashboard queries.

#### Q23: How does the distributed matching job queue avoid race conditions?
**Answer**: The matching queue uses atomic row-level lease updates:
```sql
UPDATE "MatchingJob"
SET "status" = 'LEASED', "leasedTo" = $1, "leaseExpiresAt" = NOW() + INTERVAL '60s'
WHERE "id" = $2 AND ("status" = 'QUEUED' OR "leaseExpiresAt" < NOW());
```
Because PostgreSQL evaluates `WHERE` clauses atomically under row locks, two concurrent workers attempting to claim the same job will never both succeed. Exactly one worker wins the lease, while the second worker moves to the next job in line.

---

### CATEGORY 5: SECURITY, PRIVACY & DPDP COMPLIANCE

#### Q24: How does LostLink 2.0 comply with India's Digital Personal Data Protection (DPDP) Act, 2023?
**Answer**:
1. **Data Minimization**: Only essential recovery data (name, `.edu` email, item details) is collected; no intrusive GPS location streaming.
2. **Purpose Limitation**: Student data is processed strictly for item recovery and never sold or shared with commercial advertisers.
3. **Storage Limitation & Right to Erasure**: Students can delete their accounts or retract reports, triggering automatic cascade deletion.
4. **Encrypted Blind Evidence**: Distinctive identifying details are kept in an isolated table accessible only by authorized staff.

#### Q25: Why did you use Argon2id instead of bcrypt or MD5 for password hashing?
**Answer**: Argon2id is the winner of the international Password Hashing Competition (PHC) and is recommended by OWASP ASVS 5.0. Unlike bcrypt, which is vulnerable to GPU-accelerated brute-force attacks due to low memory utilization, Argon2id is **memory-hard** ($m=65536\text{ KiB}, t=3, p=4$). It resists both custom ASIC cracking and side-channel timing attacks.

#### Q26: What is Zero-Trust Private Evidence, and why is it necessary?
**Answer**: In conventional lost-and-found systems, posting a detailed photo of an iPhone or laptop allows anyone to claim it by describing what they saw in the picture. In LostLink's zero-trust architecture, sensitive details (e.g. unique scratches, serial numbers, custom lock screens) are entered into a `PrivateItemEvidence` record. This record is hidden from public item listings and visible only to the original reporter and verified college moderators.

#### Q27: How does the One-Time Password (OTP) and QR code handover prevent impostor claims?
**Answer**: When a moderator approves a claim, the system generates a single-use 6-digit cryptographic OTP and dynamic QR code linked to the claim. During physical pickup at the campus desk, the claimant must present this code. The desk moderator enters the OTP into their verified portal, which validates and immediately invalidates the token, transitioning the item to `RETURNED`. An impostor cannot claim an item without possessing the authenticated student's session.

#### Q28: How does LostLink defend against Broken Object Level Authorization (BOLA/IDOR)?
**Answer**: Every API route handler that updates or accesses private records (e.g. `/api/items/[id]`, `/api/claims/[id]`) performs a dual check: it authenticates the caller's JWT session and explicitly checks database ownership:
`WHERE id = params.id AND (userId = session.user.id OR user.role IN ['MODERATOR', 'ADMIN'])`.
If an unauthorized student attempts to modify another student's report by altering the URL ID parameter, the server returns HTTP 403 Forbidden.

#### Q29: What file upload security restrictions are enforced for item images?
**Answer**:
1. **MIME-Type Whitelisting**: Strictly restricts uploads to `image/jpeg`, `image/png`, and `image/webp`. Malicious executable extensions (`.exe`, `.sh`, `.php`, `.svg`) are rejected.
2. **Size Boundaries**: Uploads are capped at 5MB to prevent storage denial-of-service.
3. **Magic Byte Verification**: Verifies binary file headers to prevent executable files disguised with `.jpg` extensions.

---

### CATEGORY 6: LOAD TESTING, COST OPTIMIZATION & PERFORMANCE

#### Q30: What were the quantitative results of your Grafana k6 load test?
**Answer**: We tested the live Kubernetes deployment under a 5-stage profile peaking at 100 concurrent Virtual Users (VUs):
- **Total Requests**: 4,392 HTTP requests
- **Throughput**: 47.19 requests / second
- **HTTP Error Rate**: **0.00% (0 errors)**
- **P95 Latency**: **20.49 milliseconds** (Target was $< 800\text{ms}$)
- **P99 Latency**: **316.50 milliseconds** (Target was $< 1500\text{ms}$)
- **Item Search Latency P95**: **19.00 milliseconds**

#### Q31: How did you achieve a 97.1% - 98.0% cloud cost reduction?
**Answer**: We compared a standard enterprise AWS cloud deployment (\$723.60/mo) against LostLink 2.0 (\$14.50/mo):
1. **Deterministic Matching vs Paid LLM APIs**: Replaced OpenAI API calls (\$180/mo) with a TypeScript rule engine (\$0.00).
2. **Campus Edge Workers vs Continuous Cloud VMs**: Shifted matching compute to existing campus lab PCs (\$72.00/mo saved).
3. **Container Density on Single High-Perf VPS**: Replaced AWS EKS cluster fees (\$73/mo) and multi-node EC2 instances (\$183/mo) with a single 4-core k3s Linux VPS (\$12.50/mo).
4. **In-Cluster Postgres vs Managed RDS**: Replaced AWS RDS Multi-AZ (\$138/mo) with a containerized StatefulSet with persistent SSD volume (\$0.00).
5. **Zero-Egress Storage & Ingress**: Replaced AWS ALB/NAT (\$54/mo) with Traefik and Cloudflare Free Tier (\$0.00).

#### Q32: How does the 100-point deterministic matching engine work mathematically?
**Answer**: It computes a weighted composite score:
$$\text{Score} = S_{\text{cat}} (40\text{ pts}) + S_{\text{loc}} (30\text{ pts}) + S_{\text{time}} (20\text{ pts}) + S_{\text{tokens}} (10\text{ pts})$$
- Category match gives 40 points.
- Location gives 30 points if the building matches, or 15 points if the campus matches.
- Temporal proximity gives up to 20 points decaying linearly over 7 days.
- Title token Dice coefficient gives up to 10 points.
A threshold of $\ge 60$ points triggers a candidate match.

#### Q33: Why is deterministic matching superior to AI/LLM matching for this use case?
**Answer**:
1. **Zero Cost**: Runs in 1.8ms on local CPU without paid token billing.
2. **Explainability**: Students and moderators can see exactly why two items matched (e.g. 40 pts for Category, 30 pts for Library). Generative AI produces opaque outputs that cannot be audited.
3. **Deterministic Consistency**: The same pair of items will always score identically. LLMs suffer from non-deterministic variance and hallucinations.
4. **Zero Latency**: Sub-2ms execution vs 1,500ms–3,000ms LLM network round-trips.

#### Q34: What is your disaster recovery strategy, and what were the verified RPO/RTO metrics?
**Answer**: Database snapshots are automated every 6 hours using compressed `pg_dump` and archived to off-site object storage. In our automated restore drill (`scripts/restore-test.sh`), the script spins up an ephemeral database, restores the snapshot, and verifies row counts.
- **Recovery Point Objective (RPO)**: **15 minutes** (with WAL archiving).
- **Recovery Time Objective (RTO)**: **1.2 seconds** (measured in our sandbox drill).

#### Q35: What is the purpose of the `MatchingJob` model in Prisma?
**Answer**: `MatchingJob` acts as a durable, distributed message queue inside PostgreSQL. When a student files a report, we insert a `MatchingJob` with status `QUEUED`. This decouples the student's HTTP request from the matching computation. If 500 reports are filed simultaneously, the web server returns HTTP 201 instantly without waiting for matching to finish. Edge workers drain the queue at their own pace.

#### Q36: How does LostLink prevent memory leaks in the Next.js container?
**Answer**:
1. Standalone Next.js output packaging that strips out unnecessary development dependencies.
2. Prisma client instance instantiated as a global singleton to avoid creating multiple connection pools across hot reloads.
3. Strict Kubernetes resource limits (`resources.limits.memory: 512Mi`) with active garbage collection tuning.

#### Q37: How do you verify that the cluster is healthy before routing student traffic?
**Answer**: Traefik Ingress polls our `/api/health/ready` endpoint every 5 seconds. The handler runs `await prisma.$queryRaw\`SELECT 1\``. If the database responds, it returns HTTP 200 with latency metrics. If the database is restarting or saturated, it returns HTTP 503, causing Ingress to hold or redirect traffic until the pod is ready.

#### Q38: How many automated tests are in the project, and what is the current pass rate?
**Answer**: There are **12 test suites containing 71 automated tests**, with a **100% pass rate**. These include 11 dedicated OWASP security tests, database integration tests, multi-college tenant isolation tests, matching engine unit tests, and handover OTP tests.

#### Q39: What is the current production readiness classification of LostLink 2.0?
**Answer**: The system is classified as **`CONTROLLED PILOT READY`**. It has satisfied all security audits, passed high-concurrency load testing, validated disaster recovery, and is prepared for real-world deployment across three partner universities.

#### Q40: What are three potential future enhancements for LostLink 3.0?
**Answer**:
1. **Bluetooth Low Energy (BLE) Beacon Mesh**: Installing low-cost Bluetooth beacons in campus lecture halls to automatically tag lost items based on proximity.
2. **Campus Smart-Card Integration**: Scanning university student RFID ID cards at physical security desks for sub-second handover confirmation.
3. **Cross-University Transit Federation**: Expanding the hybrid worker mesh to city bus routes connecting university campuses.

