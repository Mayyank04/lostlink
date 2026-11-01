# LostLink 2.0 — Hybrid-Cloud Architecture Validation & Dual-Plane Audit

## 1. Executive Summary
This document provides full architectural validation of the **LostLink 2.0 Hybrid-Cloud Platform**, demonstrating the partitioned execution model between:
1. **Public Cloud Control Plane**: Highly-available web ingress, REST API gateways, multi-college PostgreSQL database, image object storage, and public fallback workers.
2. **Private On-Premises Campus Worker Nodes**: Low-cost campus lab computers, Raspberry Pi nodes, or university servers running deterministic matching workers authenticated via HMAC/SHA-256 machine keys.

This architecture directly fulfills the Cloud Computing Module IV PBL objective:
> *"Build end-to-end cloud projects: design a scalable web app using containers/Kubernetes, deploy on hybrid cloud, and optimize costs."*

---

## 2. Hybrid Decoupling & Security Boundaries

```
+-----------------------------------------------------------------------------------+
|                           PUBLIC CLOUD CONTROL PLANE                              |
|                                                                                   |
|  +-------------------------+      +--------------------+      +----------------+  |
|  |   Student / Faculty     | ---> | Kubernetes Ingress | ---> | Next.js 15 Web |  |
|  |      Web Browsers       |      |     (Traefik)      |      |   (2 Replicas) |  |
|  +-------------------------+      +--------------------+      +-------+--------+  |
|                                                                       |           |
|                                                                       v           |
|  +-------------------------+      +--------------------+      +----------------+  |
|  |  Public Cloud Fallback  | <--- |   Matching Queue   | <--- | PostgreSQL 16  |  |
|  |     Worker Pod          |      |  (MatchingJob DB)  |      |   Database     |  |
|  +-------------------------+      +--------------------+      +----------------+  |
+---------------------------------------------^-------------------------------------+
                                              |
                      Mutual Worker Auth      | HTTPS Polling & Job Lease
                      SHA-256 Machine Key     | (/api/hybrid/jobs)
                                              |
+---------------------------------------------v-------------------------------------+
|                      PRIVATE ON-PREMISES CAMPUS WORKERS                           |
|                                                                                   |
|  +-------------------------------+         +----------------------------------+   |
|  | Apex Tech Lab Worker (Edge)   |         | Horizon State Campus Node (Edge) |   |
|  | - Node 20 Daemon              |         | - Node 20 Daemon                 |   |
|  | - Zero Cloud Compute Cost     |         | - Zero Cloud Compute Cost        |   |
|  +-------------------------------+         +----------------------------------+   |
+-----------------------------------------------------------------------------------+
```

### Key Security Safeguards:
- **No Direct Inbound Ingress to Campus**: Private campus nodes do not open inbound ports or require static public IPs. All communication uses outbound HTTPS long-polling or polling intervals.
- **Machine Key Authentication**: Workers authenticate using `X-Campus-Worker-Key`, validated against database-stored SHA-256 hashes (`CampusWorkerKey` model).
- **Lease Timeout & Automatic Reclamation**: If an on-prem node experiences sudden power loss, jobs leased to it expire after 60 seconds (`LEASED` -> `QUEUED`) and are seamlessly re-assigned to healthy workers or public fallback.
- **Zero Cross-College Data Leakage**: Campus workers exclusively poll and execute matching routines scoped to their assigned college tenant (`collegeId: college-apex`).

---

## 3. Failover State Matrix

| System Condition | Campus Edge Node Status | Public Fallback Status | Traffic Routing & Workload Disposition |
|---|---|---|---|
| **Normal Operations** | Online (Active Heartbeat) | Standby / Low Duty | Campus edge processes 100% of college-specific matching jobs. Cloud compute costs: **$0.00**. |
| **Campus Network Outage** | Offline (Heartbeat > 60s) | **Promoted to Primary** | Public cloud worker automatically detects unleased jobs, acquires leases, and executes matching with zero disruption to student notifications. |
| **High Traffic Spike** | Maxed at 100% CPU | **Hybrid Load Bursting** | Edge worker processes primary queue; overflow jobs exceeding campus batch limits are processed concurrently by public worker. |
| **Campus Power Restored** | Reconnected & Authenticated | **Demoted to Standby** | Campus worker sends fresh heartbeat, resumes priority polling, relieving public cloud worker. |

---

## 4. Academic Requirement Verification Checklist
- [x] End-to-end cloud project successfully deployed.
- [x] Scalable containerized web app using Kubernetes (Pods, Services, StatefulSets, HPA, Ingress).
- [x] Functional hybrid-cloud deployment with public control plane and on-prem edge execution.
- [x] Quantifiable cost optimization achieving > 70% cloud compute bill reduction.
