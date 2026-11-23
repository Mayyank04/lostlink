# Database Migrations Guide

## Schema Management via Prisma

Prisma migrations maintain safe, version-controlled schema evolution across environments.

---

## 1. Migration Directory
All migrations reside in `prisma/migrations/`:
- `20260216174742_init/`: Initial PostgreSQL schema foundation.
- `20260217031153_campus_locations/`: Campuses, locations, and multi-campus support.
- `20260217064408_security_enhancements/`: Password reset tokens, Argon2 parameters, audit logs.
- `20260217085721_multi_college_production_governance/`: Enterprise multi-tenant features and indexes.

---

## 2. Safe Production Deployment
In production environments (such as K3s on Vultr):
- **Never run `prisma db push` in production.** It can drop columns and bypass data integrity constraints.
- Run `prisma migrate deploy` to safely apply reviewed, pending SQL migrations.
- Kubernetes migration job runs before web and worker pods start.

---

## 3. Local Development Commands
- Validate schema: `npx prisma validate`
- Format schema: `npx prisma format`
- Generate Prisma Client: `npx prisma generate`
- Apply pending migrations locally: `npx prisma migrate dev`
- Run database seed: `npx prisma db seed`
