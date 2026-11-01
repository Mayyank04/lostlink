# LostLink 2.0 — College Edge Agent Installation & Operator Manual

## 1. Overview & System Requirements

The **LostLink Campus Edge Agent** is a lightweight background matching service installed on college campus IT infrastructure. It connects outbound to the LostLink Public Cloud instance, leases college-specific matching jobs, executes deterministic scoring locally, and returns match candidates.

### Hardware & Network Requirements
- **OS**: Ubuntu 20.04/22.04/24.04 LTS, Debian 12, RHEL 9, or macOS
- **Compute**: 1 vCPU, 512 MB RAM, 1 GB disk space
- **Runtime**: Node.js 20+ OR Docker 24+
- **Network**: **Outbound HTTPS (Port 443) only**. ZERO inbound firewall ports, no NAT traversal, and no public IP required.

---

## 2. Step 1: Provisioning Machine API Key

Before running the agent, college administrators must obtain a cryptographically signed machine bearer key from the platform operator.

Run the key provisioning CLI on the cloud host:
```bash
npx tsx scripts/provision-campus-key.ts <worker-id> <college-id> "<label>"

# Example:
npx tsx scripts/provision-campus-key.ts worker-apex-edge-01 college-apex "Apex Engineering Edge Agent"
```

The script prints the plain API key once:
```
-------------------------------------------------------
CAMPUS WORKER MACHINE API KEY:
  ll_camp_live_e5841bb27b7895ed2e1d50ff990d3fd16a4c865c9812480e
-------------------------------------------------------
```

> [!IMPORTANT]
> The plain key cannot be retrieved from the database later because only its SHA-256 hash is stored. Store it securely in your deployment configuration.

---

## 3. Deployment Option A: Docker Compose (Recommended)

### 1. Download Docker Compose manifest
Create a directory on your campus server:
```bash
mkdir -p /opt/lostlink-agent && cd /opt/lostlink-agent
curl -fsSL https://raw.githubusercontent.com/Mayyank04/lostlink/main/infrastructure/college-edge/docker-compose.campus-worker.yml -o docker-compose.yml
```

### 2. Configure Environment File (`.env`)
```bash
cat << 'EOF' > .env
LOSTLINK_API_BASE_URL=https://lostlink.edu
CAMPUS_COLLEGE_ID=college-apex
CAMPUS_WORKER_ID=worker-apex-edge-01
CAMPUS_WORKER_KEY=ll_camp_live_e5841bb27b7895ed2e1d50ff990d3fd16a4c865c9812480e
CAMPUS_POLL_INTERVAL_MS=3000
EOF
chmod 600 .env
```

### 3. Launch Agent Container
```bash
docker compose up -d
docker compose logs -f
```

---

## 4. Deployment Option B: Native Linux Systemd Service

For bare-metal Linux servers or existing university application VMs:

### 1. Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Campus Agent Source Code
```bash
sudo useradd -m -s /bin/bash lostlink
sudo mkdir -p /opt/lostlink-agent /etc/lostlink
sudo git clone https://github.com/Mayyank04/lostlink.git /opt/lostlink-agent
cd /opt/lostlink-agent
sudo npm ci --omit=dev
sudo npx prisma generate
sudo chown -R lostlink:lostlink /opt/lostlink-agent
```

### 3. Configure Environment File
```bash
sudo cat << 'EOF' > /etc/lostlink/campus-agent.env
LOSTLINK_API_BASE_URL=https://lostlink.edu
CAMPUS_COLLEGE_ID=college-apex
CAMPUS_WORKER_ID=worker-apex-edge-01
CAMPUS_WORKER_KEY=ll_camp_live_e5841bb27b7895ed2e1d50ff990d3fd16a4c865c9812480e
CAMPUS_POLL_INTERVAL_MS=3000
CAMPUS_HEALTH_PORT=3002
EOF
sudo chmod 600 /etc/lostlink/campus-agent.env
sudo chown lostlink:lostlink /etc/lostlink/campus-agent.env
```

### 4. Enable and Start Systemd Unit
```bash
sudo cp infrastructure/college-edge/campus-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now campus-agent
```

---

## 5. Deployment Option C: Campus Kubernetes Cluster

If your university operates an internal Kubernetes cluster:

```bash
# 1. Edit secret with machine key
kubectl apply -k k8s/overlays/campus

# 2. Verify rollout
kubectl get pods -n lostlink-campus
```

---

## 6. Health Verification & Telemetry

### Local Health Probe
The campus agent provides an internal unauthenticated health check endpoint bound to `127.0.0.1:3002`:

```bash
curl http://127.0.0.1:3002/healthz
```

Expected JSON response:
```json
{
  "status": "healthy",
  "workerId": "worker-apex-edge-01",
  "collegeId": "college-apex",
  "uptimeSeconds": 1420,
  "jobsProcessed": 18,
  "lastJobAt": "2026-11-01T16:45:00.000Z",
  "cloudConnected": true
}
```

### Cloud Central Monitoring
From the public cloud server, check worker registration and heartbeat timestamps:
```bash
./scripts/check-hybrid-status.sh
```

