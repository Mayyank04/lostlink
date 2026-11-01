# LOSTLINK 2.0 — COMPLETE ARCHITECTURE DIAGRAMS & FLOWCHARTS
## Comprehensive Technical Visualizations in Mermaid & ASCII for Academic Submission

---

### DIAGRAM 1: SYSTEM CONTEXT DIAGRAM (C4 LEVEL 1)

```mermaid
graph TD
    StudentA["Student (Reporter)<br/>[Person]<br/>Reports lost belonging"]
    StudentB["Student (Finder)<br/>[Person]<br/>Reports found belonging"]
    Moderator["Campus Security / Staff<br/>[Person]<br/>Reviews claims & oversees handover"]
    Admin["System Administrator<br/>[Person]<br/>Manages colleges & cluster health"]

    LostLink["LostLink 2.0 Platform<br/>[Software System]<br/>Multi-College Lost & Found SaaS"]

    CampusEdge["Campus Edge Nodes<br/>[External Infrastructure]<br/>University Lab Hardware"]
    ObjectStore["S3 / Cloudflare R2<br/>[External Service]<br/>Encrypted Item Image Storage"]

    StudentA -->|"Web / Mobile (HTTPS)"| LostLink
    StudentB -->|"Web / Mobile (HTTPS)"| LostLink
    Moderator -->|"Moderator Portal (HTTPS)"| LostLink
    Admin -->|"Cluster Dashboard (HTTPS)"| LostLink

    LostLink <-->|"Job Lease & Sync (HTTPS)"| CampusEdge
    LostLink -->|"Uploads & CDN (HTTPS)"| ObjectStore
```

---

### DIAGRAM 2: CONTAINER & CLUSTER ARCHITECTURE (C4 LEVEL 2)

```mermaid
graph TD
    subgraph Client_Tier["Client Devices"]
        Browser["Desktop & Mobile Browsers<br/>(React 19 / Next.js Client)"]
    end

    subgraph Kubernetes_Cluster["LostLink Kubernetes Cluster (k3s)"]
        Ingress["Traefik Ingress Controller<br/>(Port 80/443 SSL Termination)"]
        
        subgraph Web_Deployment["lostlink-web Deployment (HPA: 2-5 Replicas)"]
            Pod1["Web Pod 1<br/>Next.js 15 App Router"]
            Pod2["Web Pod 2<br/>Next.js 15 App Router"]
        end

        subgraph Worker_Deployment["lostlink-worker Deployment"]
            FallbackWorker["Cloud Fallback Worker<br/>(Daemon Node.js Process)"]
        end

        subgraph DB_StatefulSet["Database StatefulSet"]
            PostgresPod["PostgreSQL 16 Pod<br/>(10Gi PVC Persistent Storage)"]
        end

        Ingress --> Pod1
        Ingress --> Pod2
        Pod1 --> PostgresPod
        Pod2 --> PostgresPod
        FallbackWorker --> PostgresPod
    end

    Browser --> Ingress
```

---

### DIAGRAM 3: KUBERNETES PHYSICAL TOPOLOGY & TRAFFIC ROUTING

```
           +-------------------------------------------------------------+
           |                INTERNET (Student Web Traffic)               |
           +-------------------------------------------------------------+
                                          |
                                          v Port 80/443 (HTTP/HTTPS)
           +-------------------------------------------------------------+
           |           TRAEFIK INGRESS CONTROLLER (K3S HOST)             |
           |   - Path: /api/*  -> Route to Next.js API Handlers           |
           |   - Path: /*      -> Route to Next.js SSR / Static Pages    |
           +-------------------------------------------------------------+
                                          |
                    +---------------------+---------------------+
                    |                                           |
                    v                                           v
     +------------------------------+            +------------------------------+
     |   POD: lostlink-web-pod-1    |            |   POD: lostlink-web-pod-2    |
     |   IP: 10.42.0.12 (Port 3000) |            |   IP: 10.42.0.14 (Port 3000) |
     |   - UID: 1001 (nextjs)       |            |   - UID: 1001 (nextjs)       |
     |   - Limits: 500m CPU, 512Mi  |            |   - Limits: 500m CPU, 512Mi  |
     +------------------------------+            +------------------------------+
                    |                                           |
                    +---------------------+---------------------+
                                          |
                                          v Port 5432 (Internal Cluster Network)
                            +-----------------------------+
                            |     SERVICE: postgres       |
                            |   ClusterIP: 10.43.155.220  |
                            +-----------------------------+
                                          |
                                          v
                            +-----------------------------+
                            |     POD: postgres-0         |
                            |   PostgreSQL 16 Engine      |
                            |   Mount: /var/lib/data      |
                            |   PVC: 10Gi SSD Block Store |
                            +-----------------------------+
```

---

### DIAGRAM 4: HYBRID-CLOUD WORKER PARTITIONING TOPOLOGY

```mermaid
graph LR
    subgraph Cloud["PUBLIC CLOUD CONTROL PLANE"]
        CentralDB[("PostgreSQL 16<br/>MatchingJob Queue")]
        PublicWorker["Public Fallback Daemon<br/>(Standby Mode)"]
        CentralDB <--> PublicWorker
    end

    subgraph CampusA["CAMPUS LAB A (Apex Tech)"]
        ApexEdge["Edge Worker Daemon<br/>(Raspberry Pi / Lab PC)"]
    end

    subgraph CampusB["CAMPUS LAB B (Horizon State)"]
        HorizonEdge["Edge Worker Daemon<br/>(Lab Server)"]
    end

    ApexEdge -->|"HTTPS Poll /api/hybrid/jobs<br/>(X-Campus-Worker-Key: Apex)"| CentralDB
    HorizonEdge -->|"HTTPS Poll /api/hybrid/jobs<br/>(X-Campus-Worker-Key: Horizon)"| CentralDB
```

---

### DIAGRAM 5: MULTI-TENANT DATABASE ENTITY-RELATIONSHIP DIAGRAM

```mermaid
erDiagram
    College ||--o{ Campus : contains
    College ||--o{ User : enrolls
    College ||--o{ Item : catalogs
    College ||--o{ CampusWorkerKey : authorizes
    Campus ||--o{ CampusLocation : houses
    CampusLocation ||--o{ Item : locates
    User ||--o{ Item : reports
    User ||--o{ Claim : files
    User ||--o{ Session : maintains
    User ||--o{ Notification : receives
    Item ||--o{ ItemImage : exhibits
    Item ||--o{ PrivateItemEvidence : protects
    Item ||--o{ MatchingJob : triggers
    Item ||--o{ Match : pairs
    Item ||--o{ Claim : resolves
```

---

### DIAGRAM 6: DETERMINISTIC 100-POINT MATCHING ENGINE FLOWCHART

```mermaid
flowchart TD
    Start(["New Lost/Found Report Submitted"]) --> InitJob["Create MatchingJob Record (status='QUEUED')"]
    InitJob --> Lease["Worker Leases Job (status='LEASED', timeout=60s)"]
    Lease --> FetchOpposite["Fetch Active Candidate Items (Opposite Type in Same/Nearby College)"]
    
    FetchOpposite --> LoopCandidates{"For Each Candidate Pair"}
    
    LoopCandidates --> CheckCat{"Category Matches?"}
    CheckCat -- Yes --> ScoreCat["Add 40 Points"]
    CheckCat -- No --> NextCand["Score = 0 (Skip Candidate)"]
    
    ScoreCat --> CheckLoc{"Location Match?"}
    CheckLoc -- Same Room/Building --> ScoreLoc30["Add 30 Points"]
    CheckLoc -- Same Campus --> ScoreLoc15["Add 15 Points"]
    CheckLoc -- Different Campus --> ScoreLoc0["Add 0 Points"]
    
    ScoreLoc30 --> CheckTime["Calculate Temporal Proximity (Linear Decay over 7 Days)"]
    ScoreLoc15 --> CheckTime
    ScoreLoc0 --> CheckTime
    
    CheckTime --> ScoreTime["Add up to 20 Points"]
    ScoreTime --> CheckTokens["Calculate Lexical Dice Overlap on Titles"]
    CheckTokens --> ScoreTokens["Add up to 10 Points"]
    
    ScoreTokens --> TotalScore{"Total Score >= 60?"}
    TotalScore -- Yes --> CreateMatch["Create Match Record & Dispatch Notification"]
    TotalScore -- No --> LogNonMatch["Discard Below Threshold"]
    
    CreateMatch --> MoreCand{"More Candidates?"}
    LogNonMatch --> MoreCand
    NextCand --> MoreCand
    MoreCand -- Yes --> LoopCandidates
    MoreCand -- No --> MarkComplete["Update MatchingJob (status='COMPLETED')"]
    MarkComplete --> Finish(["Job Finished (< 20ms)"])
```

---

### DIAGRAM 7: END-TO-END ITEM RECOVERY STATE MACHINE

```mermaid
stateDiagram-v2
    [*] --> REPORTED : Student submits item report
    REPORTED --> MATCH_FOUND : Automated Rule Engine scores >= 60
    MATCH_FOUND --> CLAIM_SUBMITTED : Claimant submits private evidence
    
    state CLAIM_SUBMITTED {
        [*] --> EvidencePending
        EvidencePending --> ModeratorReview
    }
    
    CLAIM_SUBMITTED --> REJECTED : Moderator rejects claim
    CLAIM_SUBMITTED --> APPROVED : Moderator verifies evidence
    
    APPROVED --> HANDOVER_PENDING : In-app messaging & OTP generated
    HANDOVER_PENDING --> RETURNED : OTP verified at Campus Desk
    RETURNED --> [*]
```

---

### DIAGRAM 8: ZERO-TRUST OWNERSHIP VERIFICATION & BLIND EVIDENCE DATA FLOW

```
[CLAIMANT STUDENT]
  |
  | 1. Enters Private Evidence (Serial Number, Engraving, Lock Screen Photo)
  v
+---------------------------------------------------------------------------------+
| CLIENT BROWSER: Form Submission (HTTPS POST /api/claims)                        |
+---------------------------------------------------------------------------------+
  |
  | 2. Encrypted Evidence Payload
  v
+---------------------------------------------------------------------------------+
| SERVER API ROUTE: Session & Ownership Auth Check                                |
+---------------------------------------------------------------------------------+
  |
  | 3. Stores in PrivateItemEvidence table (HIDDEN FROM PUBLIC SEARCH)
  v
+---------------------------------------------------------------------------------+
| CENTRAL DATABASE: Item & Claim Record Created                                   |
+---------------------------------------------------------------------------------+
  |
  | 4. Notification sent to College Moderator
  v
+---------------------------------------------------------------------------------+
| MODERATOR PORTAL: Moderator views Blind Evidence vs Physical Item at Desk       |
| - If Match: One-click "APPROVE CLAIM"                                           |
| - If Mismatch: "REJECT CLAIM" with feedback                                     |
+---------------------------------------------------------------------------------+
```

---

### DIAGRAM 9: HYBRID FAILOVER & LEASE RECLAMATION SEQUENCE

```mermaid
sequenceDiagram
    autonumber
    participant EdgeWorker as On-Prem Campus Edge Node
    participant DB as Central PostgreSQL DB
    participant FallbackWorker as Public Cloud Fallback Daemon

    EdgeWorker->>DB: Acquire Lease on Job #101 (status='LEASED', leaseExpiresAt=T+60s)
    Note over EdgeWorker: Campus Power Cut / Network Severed!
    Note over EdgeWorker: Edge Worker goes offline (Heartbeat lost)
    
    Note over DB: Time passes... Clock reaches T+61s
    FallbackWorker->>DB: Query for Orphaned Jobs (status='LEASED' AND leaseExpiresAt < NOW())
    DB-->>FallbackWorker: Job #101 identified as expired!
    FallbackWorker->>DB: Atomic Update (status='LEASED', leasedTo='worker-global-fallback-01')
    FallbackWorker->>FallbackWorker: Execute 100-pt Matching Routine locally in Cloud
    FallbackWorker->>DB: Mark status='COMPLETED' & Create Notifications
    Note over FallbackWorker,DB: Zero student notifications lost!
```

---

### DIAGRAM 10: CI/CD PIPELINE FLOWCHART

```mermaid
flowchart LR
    Push(["Developer Git Push"]) --> Lint["Lint & Static Analysis"]
    Lint --> Typecheck["TypeScript Compiler (0 Errors)"]
    Typecheck --> SecurityTest["OWASP ASVS 5.0 Security Suite (11 Tests)"]
    SecurityTest --> UnitTests["Prisma & Business Logic Tests (60 Tests)"]
    UnitTests --> DockerBuild["Multi-Stage Docker Build (Next.js Standalone)"]
    DockerBuild --> K3dDeploy["Deploy to Kubernetes Cluster (k8s-deploy.sh)"]
    K3dDeploy --> K6Bench["Execute k6 Load Test Suite (100 VUs)"]
    K6Bench --> ProdReady(["Release: CONTROLLED PILOT READY"])
```

---

### DIAGRAM 11: DISASTER RECOVERY & INTEGRITY DRILL FLOW

```mermaid
flowchart TD
    Cron["Automated Backup Trigger (Every 6 Hours)"] --> Dump["pg_dump -Fc | gzip -9"]
    Dump --> Encrypt["Encrypt with AES-256 Key"]
    Encrypt --> S3Storage[("Store Snapshot in Off-Site S3 / R2")]
    
    subgraph Restore_Drill["Automated Weekly Restore Drill (scripts/restore-test.sh)"]
        Fetch["Fetch Latest Snapshot from S3"]
        Fetch --> SandboxDB[("Create Ephemeral DB 'lostlink_restore_test'")]
        SandboxDB --> Inflate["Decompress and Restore Schema + Rows"]
        Inflate --> ValidateRows{"Row Counts Match Production?"}
        ValidateRows -- Yes --> Success["Log Audit: DRILL PASSED (< 2.0s)"]
        ValidateRows -- No --> Alert["Trigger SEV-1 Backup Corruption Alert"]
        Success --> DropSandbox[("Drop Ephemeral Sandbox DB")]
    end
    
    S3Storage --> Restore_Drill
```

---

### DIAGRAM 12: GRAFANA K6 LOAD TESTING WORKLOAD PROGRESSION CURVE

```
Virtual Users (VUs)
   100 |                                       +--------------------+
       |                                      /                      \
    50 |                         +-----------+                        \
       |                        /                                      \
    25 |             +---------+                                        \
       |            /                                                    \
     5 |  +--------+                                                      +
       +---------------------------------------------------------------------> Time (s)
          0s        10s        30s         60s          80s           90s
       [Warm-up] [Ramp-up] [Peak Burst] [Stress Spike] [Recovery] [Cool-down]
```
