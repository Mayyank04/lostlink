# LostLink 2.0 — Cloud Cost Assumptions & Modeling Parameters

## 1. Baseline Assumptions (Campus Scale)
- **Active Participating Colleges**: 3 initial pilot universities (Apex Tech, Horizon State, Metro Community College)
- **Student User Base**: ~15,000 enrolled students
- **Monthly Lost/Found Reports**: ~1,200 items/month (~40 items/day)
- **Item Image Uploads**: Average 1.2 MB per item image, compressed client-side to 250 KB
- **Monthly Matching Computations**: ~120,000 candidate evaluations/month
- **Active Web Pageviews**: ~180,000 views/month

---

## 2. Infrastructure Comparison Parameters

### Architecture A: Traditional Unoptimized Public Cloud (AWS)
- **Managed Kubernetes**: AWS EKS cluster fee ($0.10/hr = $73.00/mo).
- **Compute EC2**: 3x `c5.large` on-demand instances for web and worker tiers ($0.085/hr = $183.60/mo).
- **Managed Database**: AWS RDS PostgreSQL `db.m5.large` Multi-AZ ($0.192/hr + storage = $138.00/mo).
- **Inference**: Paid OpenAI GPT-4o-mini API calls for semantic item matching (~120,000 calls @ $0.0015 = $180.00/mo).
- **Networking**: AWS Application Load Balancer ($22.00/mo) + AWS NAT Gateway ($32.00/mo + $10 bandwidth = $64.00/mo).
- **Total Unoptimized Cost**: **$625.00 / month ($7,500.00 / year)**.

### Architecture B: LostLink 2.0 Hybrid-Cloud Optimized Model
- **Public Control Plane**: Single dedicated 4 vCPU, 8GB RAM Cloud VPS (Hetzner Cloud CPX31 / DigitalOcean Droplet @ $12.00 - $14.50/mo) running lightweight k3s Kubernetes.
- **In-Cluster Database**: PostgreSQL 16 StatefulSet with attached persistent SSD volume ($3.50/mo for 25GB volume).
- **Compute Offload**: On-premise campus lab machines (Edge Workers) execute 100% of college matching tasks at **$0.00** marginal cost.
- **Matching Engine**: Deterministic TypeScript rule engine runs in ~1.8ms per pair, eliminating all paid AI/LLM API costs ($0.00).
- **Ingress & Security**: Traefik Ingress (in-cluster $0.00) paired with Cloudflare Free Tier (SSL termination, CDN, DDoS protection, $0.00).
- **Object Storage**: Cloudflare R2 / MinIO with S3 API compatibility and zero egress fees ($1.50 - $3.50/mo).
- **Total LostLink 2.0 Cost**: **$18.00 / month ($216.00 / year)**.

---

## 3. Financial Return on Investment (ROI)
- **Monthly Savings**: **$607.00 per month**
- **Annual Savings**: **$7,284.00 per year**
- **Cost Reduction Percentage**: **97.12% reduction**
- **Cost per Enrolled Student**: Less than **$0.0012 per student / year** (sustainable on any college club or departmental budget).
