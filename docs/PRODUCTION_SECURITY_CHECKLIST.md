# LostLink 2.0 — Production Security Checklist & Defense-in-Depth

## 1. Security Architecture Summary

LostLink 2.0 implements a multi-layered **Defense-in-Depth** security strategy spanning host networking, container runtimes, Kubernetes orchestrations, distributed machine authentication, and student privacy boundaries.

```
+--------------------------------------------------------------------------+
| Layer 1: Host Perimeter (UFW Firewall, SSH Key-only, Fail2ban)           |
+--------------------------------------------------------------------------+
  |
  v
+--------------------------------------------------------------------------+
| Layer 2: Transport Security (Traefik Ingress TLS 1.3, ACME Let's Encrypt)|
+--------------------------------------------------------------------------+
  |
  v
+--------------------------------------------------------------------------+
| Layer 3: Kubernetes Isolation (NetworkPolicies, PodSecurityContext, RBAC)|
+--------------------------------------------------------------------------+
  |
  v
+--------------------------------------------------------------------------+
| Layer 4: Application & Hybrid Security (Machine SHA-256 Keys, Argon2id)  |
+--------------------------------------------------------------------------+
  |
  v
+--------------------------------------------------------------------------+
| Layer 5: Data Minimization (Zero-Knowledge Evidence, PII Scrubbing)      |
+--------------------------------------------------------------------------+
```

---

## 2. Production Security Audit Verification Matrix

| Category | Security Control | Implementation Detail | Status |
| :--- | :--- | :--- | :---: |
| **Host Perimeter** | **UFW Default Deny** | Inbound ports blocked by default; only 22 (rate-limited), 80, 443 open. | **VERIFIED** |
| **Host Perimeter** | **Database Isolation** | Port 5432 is explicitly blocked from the public internet. | **VERIFIED** |
| **Host Perimeter** | **K8s API Isolation** | Port 6443 (k8s control plane) denied from public access. | **VERIFIED** |
| **Host Perimeter** | **SSH Hardening** | Password authentication disabled; root login prohibited; key-only auth. | **VERIFIED** |
| **Host Perimeter** | **Fail2ban Defense** | Automated IP jail triggers after 4 failed SSH attempts. | **VERIFIED** |
| **Container Runtime**| **Unprivileged User** | All containers run as non-root user `nextjs` (UID 1001, GID 1001). | **VERIFIED** |
| **Container Runtime**| **Minimal Attack Surface**| Multi-stage Docker builds using minimal `node:20-slim` Debian base. | **VERIFIED** |
| **Container Runtime**| **No New Privileges** | `securityContext.allowPrivilegeEscalation: false` enforced. | **VERIFIED** |
| **Kubernetes** | **NetworkPolicy Egress** | `NetworkPolicy` isolates `postgres-0`; only `lostlink-web` and `lostlink-worker` can connect. | **VERIFIED** |
| **Kubernetes** | **RBAC Least Privilege** | Pods run under scoped `lostlink-sa` ServiceAccount without cluster-admin permissions. | **VERIFIED** |
| **Kubernetes** | **Secret Separation** | Database credentials and JWT secrets stored in Kubernetes Secrets, not ConfigMaps. | **VERIFIED** |
| **Kubernetes** | **Rolling Zero-Downtime** | Rolling update strategy with `maxUnavailable: 0` ensures seamless updates. | **VERIFIED** |
| **Machine Auth** | **Hashed Machine Keys** | Edge worker bearer keys stored as irreversible SHA-256 hashes in database. | **VERIFIED** |
| **Machine Auth** | **College Scoping** | Edge workers cannot lease or complete jobs outside their registered college. | **VERIFIED** |
| **Machine Auth** | **Timing-Safe Auth** | Constant-time string comparisons protect against timing attacks. | **VERIFIED** |
| **Data Privacy** | **PII Stripping** | User emails, names, phones, and IDs are stripped from hybrid payloads. | **VERIFIED** |
| **Data Privacy** | **Zero-Knowledge Evidence**| Private ownership evidence (serial numbers, marks) is NEVER sent to workers. | **VERIFIED** |
| **App Security** | **Argon2id Hashing** | Student passwords hashed with Argon2id using high memory and iteration parameters. | **VERIFIED** |
| **App Security** | **Zod Schema Validation**| Every HTTP input is strictly validated with Zod before database queries. | **VERIFIED** |

---

## 3. Incident Response Playbook: Revoking Compromised Edge Key

If a campus edge worker's machine key is suspected of being compromised:

1. Connect to the public cloud server:
   ```bash
   ssh lostlink@<cloud-ip>
   cd /opt/lostlink-repo
   ```
2. Revoke the key immediately in the database:
   ```bash
   npx tsx -e "
     import { prisma } from './src/lib/db';
     async function revoke() {
       await prisma.campusWorkerKey.update({
         where: { workerId: 'worker-apex-edge-01' },
         data: { status: 'REVOKED' }
       });
       console.log('Worker key successfully REVOKED.');
     }
     revoke();
   "
   ```
3. Issue a fresh key and deliver to college IT:
   ```bash
   npx tsx scripts/provision-campus-key.ts worker-apex-edge-01 college-apex "Apex Primary Replacement"
   ```
4. Verify the revoked key is rejected:
   ```bash
   curl -i -X POST http://localhost:8080/api/hybrid/jobs/lease \
     -H "Authorization: Bearer <old-revoked-key>"
   # Returns: HTTP 401 Unauthorized ("Invalid or revoked campus worker credentials")
   ```

