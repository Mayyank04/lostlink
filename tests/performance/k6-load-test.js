// ==============================================================================
// LOSTLINK 2.0 — GRAFANA K6 PRODUCTION-GRADE LOAD TEST SUITE
// Cloud Computing Module IV PBL Project — Phase 6 Performance Audit
// ==============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Prometheus/k6 Metrics
export const itemsFetched = new Counter('items_fetched_total');
export const searchLatency = new Trend('search_latency_ms');
export const healthCheckLatency = new Trend('health_check_latency_ms');
export const errorRate = new Rate('http_error_rate');

// Test Configuration & Load Profile
export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Warm-up smoke test: 5 VUs
    { duration: '20s', target: 25 },  // Ramp-up to normal campus traffic: 25 VUs
    { duration: '30s', target: 50 },  // Peak traffic burst (e.g. library closing): 50 VUs
    { duration: '20s', target: 100 }, // Stress test: 100 VUs
    { duration: '10s', target: 0 },   // Cool-down
  ],
  thresholds: {
    // 95% of requests must complete under 800ms
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    // HTTP error rate must remain under 1%
    http_req_failed: ['rate<0.01'],
    http_error_rate: ['rate<0.01'],
    search_latency_ms: ['p(95)<600'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8080';

export default function () {
  // Journey 1: Student opens platform landing page
  group('1. Homepage & Static Discovery', function () {
    const res = http.get(`${BASE_URL}/`, {
      tags: { name: 'GetHomepage' },
    });
    const success = check(res, {
      'homepage status is 200': (r) => r.status === 200,
      'response body contains LostLink': (r) => r.body && r.body.includes('LostLink'),
    });
    errorRate.add(!success);
    sleep(0.5 + Math.random() * 0.5);
  });

  // Journey 2: Search and filter lost & found items
  group('2. Item Directory & Search Query', function () {
    const searchUrl = `${BASE_URL}/api/items?category=ELECTRONICS&collegeId=college-apex`;
    const start = Date.now();
    const res = http.get(searchUrl, {
      tags: { name: 'SearchItems' },
      headers: { Accept: 'application/json' },
    });
    searchLatency.add(Date.now() - start);

    const success = check(res, {
      'search status is 200': (r) => r.status === 200,
      'returns valid json array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data.items || data);
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
    itemsFetched.add(1);
    sleep(0.8 + Math.random() * 0.7);
  });

  // Journey 3: Infrastructure Readiness Health Probe
  group('3. Kubernetes Readiness Probe', function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/health/ready`, {
      tags: { name: 'ReadinessProbe' },
    });
    healthCheckLatency.add(Date.now() - start);

    const success = check(res, {
      'readiness probe is 200': (r) => r.status === 200,
      'database is connected': (r) => r.body && r.body.includes('connected'),
    });
    errorRate.add(!success);
    sleep(0.3);
  });

  // Journey 4: Distributed Hybrid Queue Status Inspection
  group('4. Hybrid Queue Telemetry', function () {
    const res = http.get(`${BASE_URL}/api/hybrid/status`, {
      tags: { name: 'HybridStatus' },
    });
    const success = check(res, {
      'hybrid status is 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
    sleep(1.0);
  });
}
