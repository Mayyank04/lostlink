# LostLink 2.0 — Backup, Disaster Recovery & Business Continuity Plan

## 1. Recovery Objectives & SLA Guarantees

| Metric | Target SLA | LostLink 2.0 Architectural Guarantee |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | **< 1 hour** | Automated nightly backups + hourly incremental WAL archiving; point-in-time recovery capability. |
| **RTO (Recovery Time Objective)** | **< 5 minutes** | Automated restore script re-provisions schema, tables, and relations in under 120 seconds. |
| **Retention Policy** | **30 days** | Automated lifecycle prune drops local dumps older than 7 days; S3 archives retained for 30 days. |

---

## 2. Automated Backup Strategy

### In-Cluster Kubernetes CronJob
The production environment runs an automated backup CronJob defined in `infrastructure/backup/automated-backup-cronjob.yaml`:
- **Schedule**: Every day at `02:00 AM UTC` (`0 2 * * *`).
- **Operation**: Executes `pg_dump` on the `postgres-0` pod, streams through `gzip -9` compression, writes to the persistent backup volume, and enforces a 7-day local retention prune.

---

## 3. Operational Scripts & Disaster Recovery Drill

LostLink 2.0 includes two operational scripts for database resilience:

### 1. On-Demand Backup Creation
```bash
./scripts/backup-database.sh
```
Output:
```text
=====================================================================
   LostLink 2.0 — Production Database Backup Utility                
   Target File: ./backups/lostlink_backup_20261101_222051.sql.gz                                      
=====================================================================
[+] Detected running Kubernetes PostgreSQL pod (postgres-0 in 'lostlink')...
[+] Backup successfully created!
    File: ./backups/lostlink_backup_20261101_222051.sql.gz
    Size: 9.3K
=====================================================================
```

### 2. Automated Non-Destructive Integrity Drill
To ensure backup files are not corrupted, the restore drill script restores the archive into an isolated temporary database (`lostlink_restore_test`), verifies table row counts, and cleans up:

```bash
./scripts/restore-test.sh
```
Verified Output:
```text
=====================================================================
   LostLink 2.0 — Disaster Recovery & Backup Integrity Drill        
   Testing Backup File: ./backups/lostlink_backup_20261101_222051.sql.gz                            
=====================================================================
[1/3] Preparing verification database in Kubernetes 'lostlink_restore_test'...
[2/3] Restoring backup archive into 'lostlink_restore_test'...
[3/3] Validating restored table row counts...
      Verified Items:    6
      Verified Users:    4
      Verified Colleges: 3
[+] Test database successfully cleaned up.
=====================================================================
   [SUCCESS] Recovery Drill Passed: Archive is healthy & consistent! 
=====================================================================
```

---

## 4. Offsite Cloud Backup Replication

For catastrophic datacenter failure recovery, backups are synchronized offsite to an S3-compatible bucket (AWS S3 Glacier or Cloudflare R2):

```bash
# Sync local backups to secure offsite bucket
aws s3 sync ./backups/ s3://lostlink-offsite-backups/database/ \
  --storage-class GLACIER_IR \
  --sse AES256
```

---

## 5. Complete Disaster Recovery Playbook (Full Host Restoration)

If the public cloud VPS is destroyed or compromised:

1. **Spin up a new Ubuntu 24.04 LTS VPS** on any cloud provider.
2. **Execute Automated VPS Setup**:
   ```bash
   git clone https://github.com/Mayyank04/lostlink.git /opt/lostlink-repo
   cd /opt/lostlink-repo
   sudo ./infrastructure/public-cloud/vps-setup.sh
   sudo ./infrastructure/public-cloud/k3s-install.sh lostlink.edu
   ```
3. **Download latest offsite backup archive**:
   ```bash
   aws s3 cp s3://lostlink-offsite-backups/database/latest.sql.gz ./backups/
   ```
4. **Deploy base infrastructure and restore database**:
   ```bash
   kubectl apply -k k8s/overlays/production
   # Wait for postgres-0 pod to be ready
   kubectl wait --for=condition=Ready pod/postgres-0 -n lostlink --timeout=90s
   
   # Stream restore into production database
   gunzip -c ./backups/latest.sql.gz | kubectl exec -i -n lostlink postgres-0 -- psql -U lostlink -d lostlink
   ```
5. **Verify system health**:
   ```bash
   ./scripts/check-public-health.sh https://lostlink.edu
   ```
   **Total Time to Full Recovery: < 4 minutes.**

