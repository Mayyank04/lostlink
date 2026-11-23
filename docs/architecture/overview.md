# Architecture Overview

## Introduction
LostLink 2.0 is a secure, multi-tenant campus Lost & Found management platform designed to service universities with strict data isolation, cryptographic verification, distributed matching, and tamper-evident audit logging.

## Core Architectural Pillars

```
+-----------------------------------------------------------------------------------+
|                                 Next.js 14 App Router                             |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  | Public & Student   |  | College Admin Portal |  | Platform Admin Governance |  |
|  | Directory, Claims  |  | Reports & Handover   |  | Multi-Tenant Management   |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                 Service Layer                                     |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  |    Item Service    |  |    Claim Service     |  |    Handover Service       |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  |   College Service  |  |  Matching Engine     |  |   Notification Service    |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                Repository Layer                                   |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  |  Item Repository   |  |   Claim Repository   |  |   Handover Repository     |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  | College Repository |  |   User Repository    |  |   Audit Log Repository    |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        PostgreSQL 16 (Vultr Managed / Local)                      |
|      Prisma ORM | Foreign Key Constraints | Tenant ID Partitioning                |
+-----------------------------------------------------------------------------------+
```

### 1. Multi-Tenant Logical Isolation
Universities and colleges are distinct logical tenants. Every student membership, item, claim, and administrative audit record is scoped to a specific `collegeId`. College administrators are strictly constrained to their own institution's data; cross-tenant access is rejected at both the middleware and service layers.

### 2. Layered Separation of Concerns
1. **Presentation Layer (`src/app/`, `src/components/`):** React Server Components (RSC) and Client Components with responsive, accessible styling adhering to `DESIGN.md`.
2. **Client Service Layer (`src/lib/services/`):** Domain-specific client SDKs that interface with backend REST endpoints with offline/demo fallback resilience.
3. **API Route Handlers (`src/app/api/`):** HTTP request validation, authentication extraction, rate limiting, and standard error handling.
4. **Server Service Layer (`src/server/services/`):** Pure server-side business rules, authorization checks, workflow transitions, notifications, and transaction boundaries.
5. **Repository Layer (`src/server/repositories/`):** Data access queries against Prisma ORM and PostgreSQL.
6. **Data Storage (`PostgreSQL`, `S3/Vultr Object Storage`):** Relational tables and object storage for public images and encrypted evidence.

### 3. Cryptographic Evidence & Handover Protection
- Sensitive verification proof (serial numbers, personal identifiers) is encrypted before storage.
- Physical handovers require an atomic 6-digit one-time verification challenge (stored as SHA-256 hash) verified by the custody officer or finder during physical exchange.

### 4. Distributed Matching Engine
Lost items and found items are compared using a deterministic multi-attribute scoring engine evaluating category, title, description, brand, color, location building, and incident timestamps. Items can be evaluated immediately inline or enqueued to distributed campus workers via the Hybrid Queue.
