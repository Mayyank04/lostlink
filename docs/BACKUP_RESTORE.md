# LostLink 2.0 — Database Backup, Restoration & Disaster Recovery Runbook

## 1. Business Continuity & Disaster Recovery Targets

In an institutional lost-and-found recovery system, data loss undermines student trust and administrative dispute resolution. Phase 4 establishes formal continuity targets:

* **Recovery Point Objective (RPO):** **< 1 hour** (maximum acceptable data loss window). In production, daily full logical dumps are complemented by PostgreSQL Write-Ahead Log (WAL) archiving.
* **Recovery Time Objective (RTO):** **< 5 minutes** (maximum acceptable duration to restore service availability following an infrastructure catastrophe).

---

## 2. Backup Architecture & Procedures

### Logical Backups via pg_dump
The `./scripts/k8s-backup-db.sh` utility communicates with the `postgres-0` StatefulSet pod through Kubernetes API exec sockets, streaming a self-contained, transactional SQL dump:

```bash
# Execute manual database backup
./scripts/k8s-backup-db.sh
```

### Backup Script Mechanics
1. Ensures directory `backups/` exists on the host.
2. Formats a microsecond timestamp (`lostlink_k8s_backup_YYYYMMDD_HHMMSS.sql`).
3. Executes `pg_dump` with `--clean --if-exists` flags to generate idempotent, self-clearing DDL schemas and DML COPY data.
4. Validates output file size and writes audit logs.

### Production Automated Cron Schedule
In production environments, automated backups are executed via a Kubernetes `CronJob`:
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: lostlink-db-backup-cron
  namespace: lostlink
spec:
  schedule: "0 */6 * * *" # Every 6 hours
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: pgdump
              image: postgres:16-alpine
              command: ["/bin/sh", "-c", "pg_dump -h postgres -U lostlink -d lostlink --clean | gzip > /backups/backup-$(date +%s).sql.gz"]
          restartPolicy: OnFailure
```

---

## 3. Database Restoration Procedure

Restoring an existing or freshly initialized cluster is executed with a single command:

```bash
# Restore specific SQL backup file
./scripts/k8s-restore-db.sh backups/lostlink_k8s_backup_20261101_213521.sql
```

### Restoration Workflow
1. Validates backup file existence on disk.
2. Pipes SQL statements into `psql -U lostlink -d lostlink` inside the active `postgres-0` pod.
3. Automatically executes database integrity checks, returning table counts for `College`, `User`, and `Item` records.

---

## 4. Disaster Recovery Playbooks

### Playbook 1: PostgreSQL Pod Crash
* **Impact:** Immediate loss of database connection.
* **Kubernetes Self-Healing:** The StatefulSet controller automatically detects pod termination and schedules a replacement `postgres-0` pod on an available node.
* **Storage Preservation:** Because storage is decoupled via PersistentVolumeClaim (`postgres-storage`), the new container mounts the existing volume without data loss.
* **Downtime:** < 10 seconds.

### Playbook 2: Persistent Volume (PVC) Corruption or Accidental Deletion
* **Impact:** Total loss of live disk data.
* **Recovery Steps:**
  1. Delete corrupted PVC: `kubectl delete pvc postgres-storage-postgres-0 -n lostlink`.
  2. Reapply manifests: `kubectl apply -k k8s/overlays/local`.
  3. Wait for new PVC creation and PostgreSQL initialization.
  4. Restore database from most recent backup:
     ```bash
     ./scripts/k8s-restore-db.sh $(ls -t backups/*.sql | head -n 1)
     ```
* **Recovery Time:** ~2 minutes.

### Playbook 3: Total Cluster Failure or Host Loss
* **Impact:** Kubernetes node or VM destroyed.
* **Recovery Steps:**
  1. Re-initialize cluster: `./scripts/k8s-create-cluster.sh`.
  2. Load container images: `./scripts/k8s-build-load.sh`.
  3. Deploy infrastructure: `./scripts/k8s-deploy.sh`.
  4. Restore database:
     ```bash
     ./scripts/k8s-restore-db.sh $(ls -t backups/*.sql | head -n 1)
     ```
  5. Execute smoke tests: `./scripts/k8s-test.sh`.
* **Recovery Time:** ~3 minutes.

---

## 5. Post-Restoration Data Integrity Verification

Run the following query inside the cluster to confirm referential integrity:
```bash
kubectl exec postgres-0 -n lostlink -- psql -U lostlink -d lostlink -c \
  "SELECT 
     (SELECT count(*) FROM \"College\") as colleges,
     (SELECT count(*) FROM \"User\") as users,
     (SELECT count(*) FROM \"Item\") as items,
     (SELECT count(*) FROM \"Claim\") as claims;"
```

Expected baseline output:
```
 colleges | users | items | claims 
----------+-------+-------+--------
        3 |     4 |     6 |      1
```
