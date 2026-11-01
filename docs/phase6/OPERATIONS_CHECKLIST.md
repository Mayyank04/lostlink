# LostLink 2.0 — Daily Operations & Administrator Maintenance Checklist

## 1. Daily Health Checks (Morning Routine — 3 Minutes)
- [ ] Execute automated probe: `./scripts/check-public-health.sh http://localhost:8080`
- [ ] Confirm 2/2 web replicas running: `kubectl get pods -n lostlink`
- [ ] Verify active edge worker heartbeats: `curl -s http://localhost:8080/api/hybrid/status | jq .summary`
- [ ] Review pending moderator approval queues for claims.

---

## 2. Weekly Maintenance Tasks
- [ ] Run automated database backup: `./scripts/k8s-backup-db.sh`
- [ ] Execute non-destructive disaster recovery verification drill: `./scripts/restore-test.sh`
- [ ] Inspect PVC disk consumption: `kubectl exec -n lostlink postgres-0 -- df -h /var/lib/postgresql/data`
- [ ] Review system audit logs for failed authentication anomalies or brute force patterns.

---

## 3. Monthly Campus Review & Reporting
- [ ] Export monthly recovery statistics (total items recovered, average claim resolution time).
- [ ] Review campus worker machine keys and rotate credentials older than 90 days.
- [ ] Verify Cloudflare R2 / S3 storage usage against billing budget ($18/mo threshold).
- [ ] Conduct database `VACUUM ANALYZE` if table bloat exceeds 15%.
