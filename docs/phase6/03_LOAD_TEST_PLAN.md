# LostLink 2.0 — Production Load Testing Plan & Benchmark Methodology

## 1. Executive Summary
This document specifies the automated load testing strategy, virtual user (VU) profiles, traffic patterns, and Service Level Objectives (SLOs) for **LostLink 2.0 — Smart Multi-College Lost & Found Platform**. The load test validates system stability under normal operations, library/campus peak rushes, and extreme load spikes on a Kubernetes cluster with hybrid worker execution.

---

## 2. Testing Objectives & Scenarios
1. **Baseline Throughput & Concurrency**: Evaluate single-node and multi-replica request handling across static routes, dynamic APIs, and database-intensive searches.
2. **Horizontal Pod Autoscaling (HPA) Verification**: Verify that the Next.js frontend pods scale elastically between 2 and 5 replicas as CPU utilization crosses the 75% target threshold.
3. **Database Connection Pool Resilience**: Stress-test PostgreSQL 16 connection pooling under concurrency to guarantee zero pool starvation or timeout errors.
4. **Hybrid Cloud Node Decoupling**: Ensure background matching job submissions do not degrade frontend interactive read latencies under load.

---

## 3. Workload Profiles & Staging Architecture

### User Journeys Emulated in Grafana k6 (`tests/performance/k6-load-test.js`):
1. **Journey 1: Student Landing & Discovery (Homepage)**
   - Emulates landing page hits (`GET /`), HTML streaming, static asset hydration.
   - P95 Target: `< 300ms`.
2. **Journey 2: Item Directory & Category Search Query**
   - Emulates real search traffic (`GET /api/items?category=ELECTRONICS&collegeId=college-apex`) with indexed database filters.
   - P95 Target: `< 600ms`.
3. **Journey 3: Kubernetes Readiness & DB Connection Probe**
   - Emulates continuous platform health check (`GET /api/health/ready`) measuring active DB query ping latency.
   - P95 Target: `< 50ms`.
4. **Journey 4: Hybrid Cluster Edge Node Heartbeat Status**
   - Emulates hybrid worker status checks (`GET /api/hybrid/status`) querying worker keys, lease expirations, and queue depths.
   - P95 Target: `< 200ms`.

### Staged VU Ramp-Up Schedule (90 Seconds Duration):
| Stage | Duration | Target VUs | Traffic Simulation Type |
|---|---|---|---|
| **Stage 1: Warm-up Smoke** | 10s | 5 VUs | Idle campus morning traffic |
| **Stage 2: Ramp-up** | 20s | 25 VUs | Passing period between lectures |
| **Stage 3: Peak Burst** | 30s | 50 VUs | End of library hours / campus closing rush |
| **Stage 4: Stress Spike** | 20s | 100 VUs | Flash event / lost exam badge spike |
| **Stage 5: Recovery/Cool-down** | 10s | 0 VUs | Traffic return to baseline |

---

## 4. Performance Thresholds & Pass/Fail Criteria (SLOs)
- **HTTP Error Rate (`http_req_failed`)**: `< 1.00%`
- **P95 HTTP Request Duration**: `< 800ms`
- **P99 HTTP Request Duration**: `< 1500ms`
- **Search Query Latency P95**: `< 600ms`
- **Database Readiness Latency**: `< 50ms`
- **Availability / Check Success**: `100%`

---

## 5. Execution Environment & Tooling
- **Load Harness**: Grafana k6 v0.57.0 (official containerized runtime)
- **Target Host**: Kubernetes `lostlink-web` Service via Traefik Ingress on `http://localhost:8080`
- **Backend Architecture**: 2x `lostlink-web` Pods (Node 20 Slim / Next.js 15), 1x `postgres-0` StatefulSet (PostgreSQL 16), 1x `lostlink-worker` daemon pod
- **Monitoring Collectors**: In-cluster Prometheus metrics exporter, k6 real-time metrics stream.
