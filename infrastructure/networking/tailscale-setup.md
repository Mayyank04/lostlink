# LostLink 2.0 — Secure Hybrid Networking via Tailscale Mesh

## Overview

In the LostLink 2.0 Hybrid-Cloud Architecture, edge matching agents run within college network premises behind university firewalls, NATs, and campus proxy filters.

While the primary communication method uses **Outbound HTTPS REST polling** (which requires zero inbound firewall openings or VPNs), universities requiring isolated peer-to-peer management, direct telemetry export, or private database replica streaming can establish a zero-trust encrypted mesh network using **Tailscale (WireGuard-based)**.

---

## 1. Network Topology

```
+-------------------------------------------------------------+
|                      Tailscale Mesh (100.64.0.0/10)        |
|                                                             |
|  +-------------------------+      +-----------------------+ |
|  | Public Cloud VPS (K3s)  | <--> | Private College Edge  | |
|  | IP: 100.90.12.34        |      | IP: 100.90.56.78      | |
|  +-------------------------+      +-----------------------+ |
+-------------------------------------------------------------+
```

---

## 2. Installation on Public Cloud VPS (Ubuntu 24.04 LTS)

```bash
# 1. Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# 2. Authenticate and join the college mesh
sudo tailscale up --authkey=tskey-auth-kxxxxxxxxxxxx-xxxxxxxxxxxxxxxx \
  --hostname=lostlink-cloud-vps \
  --accept-routes

# 3. Verify connection
tailscale status
tailscale ip -4
```

---

## 3. Installation on Private College Edge Node

```bash
# 1. Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# 2. Join mesh network
sudo tailscale up --authkey=tskey-auth-kxxxxxxxxxxxx-xxxxxxxxxxxxxxxx \
  --hostname=lostlink-campus-apex \
  --accept-routes

# 3. Verify ping to cloud VPS across encrypted tunnel
ping -c 3 100.90.12.34
```

---

## 4. ACL (Access Control List) Enforcement

In the Tailscale Admin Console (`Access Controls`), enforce strict least-privilege scoping:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["tag:campus-worker"],
      "dst": ["tag:cloud-vps:443", "tag:cloud-vps:3000"]
    },
    {
      "action": "accept",
      "src": ["group:cloud-admins"],
      "dst": ["tag:campus-worker:22", "tag:cloud-vps:22"]
    }
  ],
  "tagOwners": {
    "tag:cloud-vps": ["group:cloud-admins"],
    "tag:campus-worker": ["group:cloud-admins"]
  }
}
```

This ensures campus nodes can *only* interact with LostLink API ports on the cloud VPS and cannot traverse other internal cloud subnets.
