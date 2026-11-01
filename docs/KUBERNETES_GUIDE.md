# LostLink 2.0 — Local Kubernetes Operations & Troubleshooting Guide

## 1. Local Kubernetes Engine Comparison & Decision Matrix

When running container orchestration locally on Apple Silicon (ARM64) Macs, choosing the right Kubernetes engine directly impacts memory overhead, startup latency, and development friction:

| Engine | Apple Silicon Compatibility | RAM Footprint | Built-in Ingress | Cold Start Time | Verdict for LostLink 2.0 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **k3d (k3s in Docker)** | **Native ARM64 (`aarch64`)** | **~500MB – 800MB** | **Traefik (Included)** | **< 15 seconds** | **RECOMMENDED & ADOPTED:** Ultra-lightweight, multi-node capable, standard in modern microservices development. |
| **Docker Desktop K8s** | Native ARM64 | ~2.5GB – 3.5GB | None (Manual Helm) | ~60 – 90 seconds | High memory overhead; single-node only; lacks built-in ingress. |
| **Minikube (Docker driver)** | Good | ~1.5GB – 2.0GB | Optional Addon | ~45 seconds | Slower provisioning; requires `minikube tunnel` for ingress networking. |

---

## 2. Prerequisites & Installation

### Required Host Tools (macOS)
```bash
# 1. Install Homebrew package manager (if not present)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install Kubernetes CLI and k3d
brew install kubernetes-cli k3d

# 3. Verify Docker Desktop is installed and active
docker --version
docker compose version
```

Verify your environment using the LostLink automated check:
```bash
./scripts/check-prerequisites.sh
```

---

## 3. End-to-End Cluster Lifecycle

### Step 1: Initialize the k3d Cluster
Creates a dual-node Kubernetes cluster (1 control plane, 1 worker agent) with port bindings mapped directly to your Mac (`8080` for HTTP and `8443` for HTTPS):
```bash
./scripts/k8s-create-cluster.sh
```

### Step 2: Build & Import Docker Images
Compiles multi-stage production images for Next.js web application and the background worker daemon, then loads them directly into the k3d cluster container cache:
```bash
./scripts/k8s-build-load.sh
```

### Step 3: Deploy Manifests
Deploys ConfigMaps, Secrets, PostgreSQL StatefulSet, database migration Job, Web and Worker Deployments, ServiceAccounts, NetworkPolicies, Ingress, and HPA:
```bash
./scripts/k8s-deploy.sh
```

### Step 4: Verify Cluster Health
Audits all nodes, pods, services, ingress routing, and metrics:
```bash
./scripts/k8s-status.sh
```

### Step 5: Execute Automated Smoke Tests
Runs 5 automated verification checks against the live cluster:
```bash
./scripts/k8s-test.sh
```

### Step 6: Cluster Teardown
Destroys the k3d cluster, releasing all system memory and allocated disk:
```bash
./scripts/k8s-cleanup.sh
```

---

## 4. Useful Kubectl Cheat Sheet

### Workload Inspection
```bash
# View all pods in the lostlink namespace
kubectl get pods -n lostlink -o wide

# View detailed pod events and conditions
kubectl describe pod <pod-name> -n lostlink

# View live log streams
kubectl logs -f deployment/lostlink-web -n lostlink -c web
kubectl logs -f deployment/lostlink-worker -n lostlink -c worker
kubectl logs job/lostlink-db-migrate -n lostlink

# Inspect live cluster resource utilization
kubectl top nodes
kubectl top pods -n lostlink
```

### Interactive Debugging & Shell Access
```bash
# Open interactive shell in web pod
kubectl exec -it deployment/lostlink-web -n lostlink -c web -- /bin/sh

# Verify current runtime user (should output UID 1001)
kubectl exec deployment/lostlink-web -n lostlink -c web -- id

# Open PostgreSQL terminal directly inside the database pod
kubectl exec -it postgres-0 -n lostlink -- psql -U lostlink -d lostlink
```

### Scaling & Rollouts
```bash
# Manually scale web replicas
kubectl scale deployment/lostlink-web --replicas=4 -n lostlink

# Monitor rollout progression
kubectl rollout status deployment/lostlink-web -n lostlink

# Restart deployment with zero downtime
kubectl rollout restart deployment/lostlink-web -n lostlink
```

---

## 5. Troubleshooting Playbook

### Scenario A: `CrashLoopBackOff` on Web or Worker Pods
* **Root Cause:** Database is not ready or `DATABASE_URL` credentials are misconfigured.
* **Resolution:** 
  1. Inspect initContainer logs: `kubectl logs <pod-name> -n lostlink -c wait-for-db`.
  2. Verify PostgreSQL StatefulSet is healthy: `kubectl get pods -n lostlink -l app=postgres`.
  3. Verify secrets match: `kubectl get secret lostlink-secrets -n lostlink -o yaml`.

### Scenario B: `ErrImageNeverPull` or `ImagePullBackOff`
* **Root Cause:** Container image was not imported into the k3d cluster nodes.
* **Resolution:** Run `k3d image import lostlink-web:latest lostlink-worker:latest -c lostlink-cluster`.

### Scenario C: PVC Remains in `Pending` State
* **Root Cause:** Storage provisioner failed or insufficient node disk space.
* **Resolution:** Run `kubectl describe pvc postgres-storage-postgres-0 -n lostlink`. Verify k3s `local-path` provisioner is running in `kube-system`.

### Scenario D: `NetworkPolicy` Blocks Database Connections
* **Root Cause:** A test pod or tool was launched without the proper `app: lostlink-web` or `app: lostlink-worker` label.
* **Resolution:** Ensure any debugging client pods specify matching labels in their pod metadata to satisfy `postgres-network-policy`.
