# Environment Variables Reference

All environment variables are validated at startup via `src/lib/config/env.ts`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (`postgresql://user:pass@host:port/db?sslmode=...`). |
| `SESSION_SECRET` | Yes | — | Secret string (minimum 32 characters) used to sign and verify session cookies. |
| `STORAGE_ENDPOINT` | No | `https://blr1.vultrobjects.com` | S3-compatible object storage endpoint. |
| `STORAGE_REGION` | No | `blr1` | Object storage region. |
| `STORAGE_BUCKET` | No | `lostlink-prod` | Name of the bucket storing images and evidence. |
| `STORAGE_ACCESS_KEY` | No | `""` | Object storage access key ID. |
| `STORAGE_SECRET_KEY` | No | `""` | Object storage secret access key. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Canonical public application URL. |
| `NEXT_PUBLIC_DEMO_MODE` | No | `false` | Enables local store fallback when database is offline. |
| `NODE_ENV` | No | `development` | Node runtime environment (`development`, `test`, `production`). |
