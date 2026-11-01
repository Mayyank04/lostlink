# LostLink 2.0 — Monitoring, Observability & Alerting Architecture

## 1. Executive Summary
This document defines the monitoring topology, health check probes, Prometheus metrics exports, and alert trigger thresholds configured for **LostLink 2.0**.

---

## 2. Health Check & Synthetic Probes Specification

LostLink provides dedicated probe endpoints exposed over HTTP:

### 2.1 Liveness Probe (`GET /api/health/live`)
- **Purpose**: Validates that the Next.js Node.js runtime process is responsive and event loop is not hung.
- **Payload**:
  ```json
  {
    "status": "alive",
    "timestamp": "2026-11-01T17:18:30.433Z",
    "uptime": 38.62,
    "pid": 1
  }
  ```
- **Kubelet Action**: If probe fails 3 consecutive times, Kubelet restarts the container.

### 2.2 Readiness Probe (`GET /api/health/ready`)
- **Purpose**: Validates database connectivity by issuing an active query ping (`SELECT 1`).
- **Payload**:
  ```json
  {
    "status": "ready",
    "timestamp": "2026-11-01T17:18:30.481Z",
    "database": "connected",
    "latencyMs": 1
  }
  ```
- **Kubelet Action**: If database becomes unreachable, ingress traffic is instantly diverted away from this pod until recovery.

### 2.3 Hybrid Worker Fleet Status (`GET /api/hybrid/status`)
- **Purpose**: Monitors edge worker heartbeats, active worker count, and matching queue depth.
- **Payload**:
  ```json
  {
    "status": "healthy",
    "summary": {
      "totalRegisteredWorkers": 2,
      "activeOnlineWorkers": 2,
      "queueMetrics": {
        "totalJobs": 0,
        "queued": 0,
        "leased": 0,
        "completed": 0,
        "failed": 0
      }
    }
  }
  ```

---

## 3. Prometheus Alerting Rules

```yaml
groups:
  - name: lostlink-alerts
    rules:
      - alert: DatabaseConnectivityDown
        expr: lostlink_ready_status{database="connected"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL Database Unreachable from Web Pods"
          description: "All database queries are failing. Investigate postgres-0 pod immediately."

      - alert: HighHTTPErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "HTTP 5xx Error Rate Exceeds 5%"

      - alert: HighP95Latency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.800
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 Latency Exceeds 800ms SLA"

      - alert: HybridEdgeWorkerOffline
        expr: lostlink_active_online_workers < 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "All Campus Edge Nodes are Offline"
          description: "Public cloud fallback daemon has assumed matching execution. Cloud compute costs may increase."

      - alert: MatchingJobQueueStalled
        expr: lostlink_queued_jobs > 50
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Matching Queue Backlog Growing"
```
