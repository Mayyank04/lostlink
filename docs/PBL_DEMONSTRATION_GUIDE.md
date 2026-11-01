# LostLink 2.0 — PBL Demonstration & Viva Defense Guide

## Cloud Computing Module IV — Project-Based Learning (PBL)

**Project Title**: LostLink 2.0 — Smart Multi-College Lost & Found Platform  
**PBL Problem Statement**: *"Build end-to-end cloud projects: design a scalable web app using containers/Kubernetes, deploy on hybrid cloud, and optimize costs."*

---

# PART 1: 5-MINUTE LIVE DEMONSTRATION SCRIPT

Follow this exact walkthrough during your viva or project presentation:

### Step 1: High-Level Architecture Pitch (1 Minute)
> *"Respected examiners, LostLink 2.0 is a production-grade multi-college lost-and-found platform. To solve real-world university privacy and cloud cost challenges, we designed a **Hybrid-Cloud Architecture**. Our web frontend, persistent PostgreSQL database, and cloud fallback workers run in Kubernetes on a hardened Cloud VPS (Environment A). However, to protect student privacy and eliminate expensive cloud compute bills, deterministic matching algorithms are offloaded to **College Campus Edge Agents** running inside university networks (Environment B) over an outbound-only, zero-inbound-port HTTPS REST link."*

### Step 2: Show Kubernetes & Container Infrastructure (1 Minute)
Open your terminal and show the live cluster:
```bash
# Show nodes and running pods
kubectl get nodes -o wide
kubectl get pods -n lostlink -o wide
```
**Talking Points**:
- Point out the `postgres-0` StatefulSet with persistent volume.
- Point out the multi-replica Next.js web application (`lostlink-web`).
- Point out the background worker (`lostlink-worker`).
- Mention that every pod runs as an **unprivileged non-root user (UID 1001)** with resource requests and limits enforced.

### Step 3: Run the Live Hybrid Failover Benchmark (1.5 Minutes)
Execute the automated failover test right in front of the examiners:
```bash
./scripts/test-hybrid-failover.sh
```
**Talking Points as the test runs**:
- **Stage 1 (Normal Operation)**: Campus edge worker leases the job and completes it in ~8 ms.
- **Stage 2 (Failure Injection)**: The campus worker is disconnected. The Public Cloud Fallback Watchdog automatically claims the orphaned job and completes it in ~4 ms.
- **Stage 3 (Split-Brain Defense)**: The late campus worker tries to submit duplicate results, but the cloud rejects it (`Invalid job status`), proving zero duplicate matches!
- **Stage 4 (Recovery)**: Campus worker returns online and resumes normal operation in ~3 ms.

### Step 4: Show Hybrid Status & Queue Metrics (30 Seconds)
```bash
./scripts/check-hybrid-status.sh
```
**Talking Points**:
- Show the registered campus workers, heartbeat timestamps, and the split between campus executions and cloud fallback executions.

### Step 5: Cost Optimization Defense (1 Minute)
Show the cost comparison chart:
- Show that by offloading compute to existing college edge PCs and running K3s on a VPS, **total monthly cost is only \$20.00 (₹1,690)** compared to **\$291.50 (₹24,632)** on AWS EKS with RDS — a **93.1% cost reduction**!

---

# PART 2: 25 BEGINNER-FRIENDLY VIVA QUESTIONS & ANSWERS

### Q1: What is Cloud Computing, and why did you use it for LostLink?
**Answer**: Cloud computing is the on-demand delivery of computing power, database storage, applications, and other IT resources over the internet. For LostLink, cloud computing allows students across multiple colleges to access a shared lost-and-found registry 24/7 without requiring any single college to host and maintain central servers.

### Q2: What is the difference between Public Cloud, Private Cloud, and Hybrid Cloud?
**Answer**:
- **Public Cloud**: Cloud services provided over the public internet by third-party providers (e.g. Hetzner, AWS, DigitalOcean).
- **Private Cloud**: Cloud infrastructure dedicated solely to a single organization (e.g., servers inside a university computer lab).
- **Hybrid Cloud**: An environment that combines public cloud and private infrastructure, allowing data and apps to be shared between them. LostLink uses hybrid cloud: public cloud for web/database, private college edge for matching computation.

### Q3: Why is LostLink's architecture considered "Hybrid Cloud"?
**Answer**: LostLink splits its workloads across two distinct environments:
1. **Environment A (Public Cloud)**: Hosts the web frontend, student authentication, and centralized database.
2. **Environment B (Private College Edge)**: Runs matching workers directly on college hardware inside university local networks. They coordinate over secure HTTPS.

### Q4: What is the benefit of running matching workers on college campus hardware?
**Answer**: Two major benefits:
1. **Zero Marginal Compute Cost**: Universities utilize hardware they already own instead of paying cloud providers for CPU time.
2. **Student Privacy**: Matching calculations happen locally within college boundaries without exposing private student ownership evidence to external third-party AI APIs.

### Q5: How do campus edge workers communicate with the public cloud without opening firewall ports?
**Answer**: Campus workers use an **Outbound-Only Long-Polling Protocol**. The campus agent reaches *out* to the public cloud over standard HTTPS (Port 443) to check for jobs. Because the connection is outbound, university firewalls permit the traffic by default, requiring **zero inbound ports** or public IP addresses.

### Q6: What is Docker, and why did you containerize LostLink?
**Answer**: Docker is an open-source platform that packages an application and all its dependencies into an isolated unit called a container. It solves the *"it worked on my machine"* problem, ensuring LostLink runs identically on developer Macs, cloud servers, and college Linux nodes.

### Q7: What is a Multi-Stage Dockerfile, and why did you use it?
**Answer**: A multi-stage Dockerfile uses multiple `FROM` instructions in a single file to separate the build environment from the runtime environment. In LostLink:
- Stage 1 compiles TypeScript, installs npm packages, and generates Prisma code.
- Stage 2 copies only the production files into a minimal, slim container.
This dramatically reduced our container image size from ~1.5 GB down to ~220 MB and improved security.

### Q8: What is Kubernetes, and what role does it play in this project?
**Answer**: Kubernetes (K8s) is an open-source container orchestration system that automates the deployment, scaling, and management of containerized applications. In LostLink, Kubernetes automatically manages container health, restarts crashed pods, scales web pods during traffic spikes, and routes HTTP traffic via Ingress.

### Q9: What is K3s, and why choose it over standard Kubernetes or AWS EKS?
**Answer**: K3s is a certified, lightweight Kubernetes distribution created by Rancher. It packages all Kubernetes components into a single binary consuming less than 512 MB of RAM. We chose K3s because standard Kubernetes and AWS EKS are bloated and charge \$73/month just for the control plane. K3s gave us 100% standard Kubernetes features on a \$7/month VPS with zero license or control plane fees.

### Q10: What is a Pod in Kubernetes?
**Answer**: A Pod is the smallest deployable unit in Kubernetes. It encapsulates one or more containers that share the same network IP, storage volumes, and namespace. In LostLink, our web app, worker, and database each run in their own dedicated pods.

### Q11: What is a StatefulSet, and why did you use it for PostgreSQL instead of a Deployment?
**Answer**: A Deployment is meant for stateless applications (like our Next.js web pod) where pods can be created, destroyed, or swapped interchangeably. A StatefulSet is designed for stateful applications like databases because it provides unique persistent volume attachments and stable network identities, ensuring our database files are never lost or corrupted when pods restart.

### Q12: What is a PersistentVolumeClaim (PVC)?
**Answer**: A PVC is a request for persistent disk storage by a pod. In LostLink, `postgres-0` uses a PVC so that PostgreSQL database data is written to host physical disk storage. If the postgres container restarts or upgrades, all student records and items remain intact.

### Q13: How does Ingress work in your Kubernetes cluster?
**Answer**: An Ingress is an API object that manages external access to services within the cluster, typically HTTP/HTTPS. LostLink uses the Traefik Ingress controller to receive requests on port 80/443 and intelligently route them to the `lostlink-web` service on port 3000 based on hostnames like `lostlink.edu`.

### Q14: What is Horizontal Pod Autoscaling (HPA)?
**Answer**: HPA automatically increases or decreases the number of pod replicas based on observed CPU or memory utilization. In LostLink, if students flood the site during campus festivals and CPU usage exceeds 70%, HPA automatically scales web pods from 2 up to 5 replicas to handle the load, and scales down when traffic subsides.

### Q15: What is the purpose of Liveness and Readiness Probes?
**Answer**:
- **Liveness Probe** (`/api/health/live`): Checks if the container process is alive. If it hangs or deadlocks, Kubernetes kills and restarts the container.
- **Readiness Probe** (`/api/health/ready`): Checks if the application is ready to accept user traffic (e.g. database connection is active). If the database is busy, Kubernetes temporarily stops routing student traffic to that pod until it recovers.

### Q16: How does the Distributed Matching Job Queue work?
**Answer**: When a student reports a lost or found item, the system creates a `MatchingJob` record in the database with status `QUEUED`. Campus edge workers poll the `/api/hybrid/jobs/lease` endpoint. When a worker claims a job, it is granted a 30-second lease Time-To-Live (TTL). Once finished, the worker submits matches via `/api/hybrid/jobs/[id]/complete`.

### Q17: What happens if a campus edge worker crashes while processing a job?
**Answer**: When a worker crashes, its 30-second lease expires. The public cloud has a **Fallback Watchdog** daemon running inside `lostlink-worker`. The watchdog scans for jobs whose `leaseExpiresAt` timestamp has passed, reclaims the job, processes the matching algorithm in the cloud, and notifies the student. Zero jobs are lost.

### Q18: What is a "Split-Brain" condition in distributed systems, and how did you prevent it?
**Answer**: Split-brain occurs when two workers (e.g., campus edge and cloud fallback) believe they both own the same job and submit conflicting or duplicate results. We prevented this using **Atomic Optimistic Locking** in PostgreSQL:
When a worker submits results, the transaction verifies the job status is still `LEASED` and the worker ID matches. If the fallback worker already finalized the job, the delayed worker's submission is rejected immediately, guaranteeing zero duplicate match records.

### Q19: How are machine API keys secured in LostLink?
**Answer**: Campus edge agents authenticate using high-entropy machine bearer tokens (prefixed `ll_camp_live_*`). Following security best practices, the database **never stores plain keys**. Instead, only their SHA-256 cryptographic hashes are stored. When a request arrives, we hash the incoming token and verify it against the database using timing-safe comparisons.

### Q20: How do you protect student privacy in a multi-college architecture?
**Answer**: We implement a **Zero-Knowledge Evidence Boundary**:
1. When jobs are leased to edge workers, sensitive student PII (names, emails, phone numbers) is stripped from the payload.
2. Private ownership evidence (serial numbers, hidden markings, unlock patterns) is stored in a separate encrypted table and is **never transmitted to matching workers**.
3. Students from different colleges cannot see each other's reports unless a multi-college cross-campus match is authorized.

### Q21: What is Kustomize, and why did you use Overlays?
**Answer**: Kustomize is a template-free configuration tool built into `kubectl`. It allows developers to define a shared `base` set of Kubernetes manifests and create environment-specific `overlays` (`local`, `staging`, `production`, `campus`). For example, production overlays add TLS certificates and 3 replicas without duplicating the base code.

### Q22: What is your Disaster Recovery (DR) strategy, and what are RPO and RTO?
**Answer**:
- **RPO (Recovery Point Objective)**: Maximum acceptable data loss duration. Our RPO is < 1 hour via automated daily CronJob backups and WAL logs.
- **RTO (Recovery Time Objective)**: Maximum time to restore operations after a disaster. Our RTO is < 5 minutes using our automated `./scripts/restore-test.sh` script, which can restore the entire database in under 120 seconds.

### Q23: How does your CI/CD pipeline work?
**Answer**: We use GitHub Actions:
- On every pull request or branch push, the **Staging Workflow** runs TypeScript typechecking, executes 60 Vitest tests, validates Kustomize manifests, and builds Docker images.
- The **Production Workflow** triggers on tagged releases (`v*.*.*`) or manual approval, generates immutable SHA-tagged images pushed to GitHub Container Registry, rolls out updates to Kubernetes with zero downtime, and automatically rolls back if health checks fail.

### Q24: How does LostLink optimize cloud infrastructure costs?
**Answer**: We optimize costs across four dimensions:
1. **No Managed K8s Fee**: Running K3s on a VPS saves \$73/month in AWS EKS control plane fees.
2. **Edge Offloading**: Matching compute runs on existing college PCs for free, keeping cloud CPU usage below 15%.
3. **Data Minimization**: Transferring only small JSON strings (~1.2 KB) avoids expensive cloud egress bandwidth fees.
4. **Automated Resource Limits**: Memory and CPU requests/limits prevent runaway cloud resource consumption.

### Q25: If you had to scale LostLink to 50 colleges nationwide, what architectural changes would you make?
**Answer**:
1. Upgrade the single-node K3s cluster to a **Multi-Node K3s / Cilium Cluster** with dedicated worker nodes spread across geographic availability zones.
2. Separate PostgreSQL from the cluster into a **Managed High-Availability Database** (e.g. AWS Aurora or Hetzner Managed Postgres) with read replicas.
3. Replace the database-backed polling queue with a dedicated distributed event stream like **Apache Kafka** or **NATS JetStream** for sub-millisecond job distribution.
4. Use **Cloudflare R2** with global CDN caching for item photo uploads with zero egress fees.
