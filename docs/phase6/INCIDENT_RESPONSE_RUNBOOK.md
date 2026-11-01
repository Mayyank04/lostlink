# LostLink 2.0 — Incident Response Runbook & SRE Procedures

## 1. Incident Severity Definitions
- **SEV-1 (Critical)**: Total platform outage, database corruption, or security data breach. RTO: $< 15\text{ minutes}$.
- **SEV-2 (Major)**: Partial functionality degraded (e.g. image uploads failing, background matching paused). RTO: $< 1\text{ hour}$.
- **SEV-3 (Minor)**: Non-critical cosmetic bug or single college edge node offline (fallback operating). RTO: $< 24\text{ hours}$.

---

## 2. Standard Triage Workflows

### Scenario A: Web Pod CrashLoopBackOff
1. Check failing pod logs:
   ```bash
   kubectl logs -n lostlink -l app=lostlink-web --tail=100
   ```
2. Inspect pod exit status:
   ```bash
   kubectl describe pod -n lostlink -l app=lostlink-web
   ```
3. If memory OOMKilled, temporarily scale memory limit or restart:
   ```bash
   kubectl rollout restart deployment lostlink-web -n lostlink
   ```

### Scenario B: Database Unreachable (`DatabaseConnectivityDown`)
1. Check PostgreSQL pod status:
   ```bash
   kubectl get pods -n lostlink -l app=postgres
   ```
2. Verify PostgreSQL logs:
   ```bash
   kubectl logs -n lostlink statefulset/postgres --tail=50
   ```
3. Test direct internal socket connectivity:
   ```bash
   kubectl exec -i -n lostlink postgres-0 -- pg_isready -U lostlink
   ```
4. If storage volume full, inspect PVC disk usage:
   ```bash
   kubectl exec -i -n lostlink postgres-0 -- df -h /var/lib/postgresql/data
   ```

### Scenario C: Hybrid Edge Node Offline Alert
1. Query hybrid health endpoint:
   ```bash
   curl -s http://localhost:8080/api/hybrid/status | jq .
   ```
2. Check if Public Cloud Fallback is executing jobs:
   ```bash
   kubectl logs -n lostlink -l app=lostlink-worker --tail=50
   ```
3. Contact campus lab technician to verify on-premises machine power and outbound network link. Note: Fallback ensures zero student disruption.

### Scenario D: Suspected Security Incident / Token Compromise
1. Invalidate compromised user session immediately:
   ```sql
   DELETE FROM "Session" WHERE "userId" = 'target-user-id';
   ```
2. Rotate JWT and NextAuth secret in `k8s/base/secret.yaml`.
3. Perform rolling restart:
   ```bash
   kubectl rollout restart deployment lostlink-web -n lostlink
   ```
