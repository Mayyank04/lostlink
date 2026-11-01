# LostLink 2.0 — Phase 5 Cloud Infrastructure Cost Analysis & ROI

## 1. Executive Summary

A core objective of the Cloud Computing Module IV PBL assignment is to **"design a scalable web app using containers/Kubernetes, deploy on hybrid cloud, and optimize costs."**

LostLink 2.0 achieves industry-leading cost efficiency by adopting a **Hybrid-Cloud K3s Architecture**:
- Centralized public services run on lightweight, cost-effective Cloud VPS infrastructure.
- CPU-intensive deterministic matching algorithms are offloaded to existing on-premises college hardware at **\$0 marginal compute cost**.
- Egress costs are minimized because private photos and evidence remain cloud-hosted while edge nodes process only lightweight sanitized JSON payloads.

**Exchange Rate Baseline**: \$1.00 USD = ₹84.50 INR.

---

## 2. Comprehensive Three-Way Architecture Cost Comparison

The table below contrasts the actual costs of three production-grade architectural models capable of serving a **5-College Pilot (10,000 active students, ~25,000 items/year)**:

| Cost Item | Architecture 1: LostLink 2.0 Hybrid K3s (Chosen) | Architecture 2: Managed Cloud (AWS EKS + RDS) | Architecture 3: Pure Serverless (Vercel + Neon + Upstash) |
| :--- | :---: | :---: | :---: |
| **Control Plane Fee** | **$0.00** (Embedded K3s) | \$73.00 (AWS EKS Cluster Fee) | \$0.00 |
| **Compute Nodes** | **$14.50** (Hetzner CPX31: 4 vCPU, 8GB) | \$84.20 (2x t4g.medium on-demand) | \$20.00 (Vercel Pro Team Seat) |
| **Edge Compute** | **$0.00** (Existing College Hardware) | N/A (All compute centralized) | N/A (Serverless compute limits) |
| **Database** | **$0.00** (In-Cluster Postgres StatefulSet) | \$68.40 (AWS RDS db.t4g.medium) | \$29.00 (Neon Autoscaling Postgres) |
| **Persistent Storage** | **$4.00** (160GB NVMe included + 50GB S3) | \$25.00 (EBS gp3 + S3 Standard) | \$15.00 (S3 + Vercel Blob) |
| **Network & Ingress** | **$0.00** (20TB included bandwidth + Traefik) | \$32.40 (AWS ALB + NAT Gateway) | \$20.00 (Vercel Edge Network) |
| **SSL / TLS Certificates**| **$0.00** (cert-manager Let's Encrypt) | \$0.00 (AWS Certificate Manager) | \$0.00 (Vercel Auto-SSL) |
| **Backup Storage** | **$1.50** (AWS S3 Glacier Instant Retrieval) | \$8.50 (RDS Automated Snapshots) | \$5.00 (Neon Point-in-time Restore) |
| **TOTAL MONTHLY (USD)**| **$20.00** | **$291.50** | **$89.00** |
| **TOTAL MONTHLY (INR)**| **₹1,690** | **₹24,632** | **₹7,520** |
| **ANNUAL COST (INR)** | **₹20,280** | **₹2,95,584** | **₹90,240** |
| **SAVINGS vs AWS EKS** | **93.1% Savings** | Baseline | 69.5% Savings |

---

## 3. Scale Tier Projections (1 to 25 Colleges)

### Tier 1: Evaluation & Demonstration (1 College, 500 Students)
- **Infrastructure**: Hetzner CPX21 (3 vCPU, 4GB RAM) + Local Mac / Lab PC Edge Node
- **Monthly Cost**: **\$7.60 (₹642)**
- **Annual Cost**: **\$91.20 (₹7,706)**

### Tier 2: Multi-College Pilot (5 Colleges, 10,000 Students)
- **Infrastructure**: Hetzner CPX31 (4 vCPU, 8GB RAM) + 5 Campus Edge Agents
- **Monthly Cost**: **\$20.00 (₹1,690)**
- **Annual Cost**: **\$240.00 (₹20,280)**

### Tier 3: University Consortium Production (25 Colleges, 100,000 Students)
- **Infrastructure**: 2x Hetzner Dedicated Cloud (8 vCPU, 16GB RAM) + Managed Cloud Postgres HA + 25 Campus Edge Nodes
- **Monthly Cost**: **\$82.00 (₹6,929)**
- **Annual Cost**: **\$984.00 (₹83,148)**
- *Equivalent AWS EKS deployment would cost \$850+/month (₹71,825/month).*

---

## 4. Cost Optimization Strategy Rationale

### 1. Edge-Compute Offloading
Matching algorithm computation scales as $\mathcal{O}(M \times N)$ comparisons between lost and found items. By shifting execution to college edge agents, public cloud CPU utilization remains under 15% during peak lost report bursts, avoiding costly horizontal auto-scaling compute charges.

### 2. Elimination of Hyperscaler Tax
Managed Kubernetes services (AWS EKS, GCP GKE, Azure AKS) charge \$0.10/hour (\$73/month) simply to keep the cluster control plane active, plus mandatory VPC NAT Gateway charges (\$32+/month). Running K3s on hardened Linux VPS eliminates these fixed charges entirely while preserving 100% standard Kubernetes API compatibility.

### 3. Data Minimization Saves Egress Costs
Public cloud providers charge up to \$0.09 per GB of outbound data egress. LostLink's edge protocol transfers only lightweight sanitized JSON payloads (average ~1.2 KB per matching job), reducing hybrid link network transfer to less than 250 MB per month across thousands of reports.

### 4. Automated Storage Tiering
Image uploads use local disk storage in development and demo tiers, and low-cost S3-compatible Object Storage (e.g. Cloudflare R2 with **\$0 egress fees** or Hetzner Storage Box at €3.81 for 1 TB) in production.

