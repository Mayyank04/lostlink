# LostLink 2.0 — Software Composition Analysis & Dependency Security Report

## 1. Dependency Analysis Summary

```
Total Dependencies: 622
  - Production Dependencies: 119
  - Development Dependencies: 470
  - Optional Dependencies: 108
  - Peer Dependencies: 1
```

---

## 2. Production Dependencies Exposure Assessment
- **Status: CLEAN (0 Vulnerabilities)**
- All direct production runtime dependencies (`@aws-sdk/client-s3`, `@hookform/resolvers`, `@prisma/client`, `argon2`, `class-variance-authority`, `clsx`, `jose`, `lucide-react`, `next`, `react`, `react-dom`, `react-hook-form`, `recharts`, `tailwind-merge`, `zod`) have **zero critical, zero high, and zero moderate vulnerabilities** reported.
- Production Docker container and Kubernetes deployments run with `NODE_ENV=production` using the standalone Next.js build (`output: 'standalone'`), omitting all development dependencies from the production image.

---

## 3. Development Dependencies Findings (`npm audit`)

The development dependencies report 17 advisories, categorized below:

| Package | Severity | Category | Advisory | Production Impact |
|---|---|---|---|---|
| `vitest` (v2.1.8) | Critical | Dev Tooling | GHSA-9crc-q9x8-hgqq / GHSA-5xrq-8626-4rwp (Vitest UI & API server RCE / path traversal) | **None.** LostLink uses `vitest run` purely in CLI test execution. The Vitest UI server (`--ui` / `--api`) is not run or deployed in production. |
| `@vitest/mocker` | Moderate | Dev Tooling | GHSA-82fw-gwwq-j7x9 (Redirect Mock path traversal) | **None.** Development mock utility not present in production. |
| `vite` / `vite-node` | Moderate | Dev Tooling | Transitive dependency of Vitest CLI | **None.** Vite is not used as the application server; Next.js webpack/turbopack serves the app. |
| `eslint-config-next` / `@typescript-eslint` | Moderate / High | Linter | ReDoS in `minimatch` and `glob` transitive parser dependencies | **None.** Build-time linter executed only during CI/CD; not included in production runtime. |

---

## 4. Software Composition Recommendations
1. **Vitest Upgrade Strategy:** Vitest 3.x+ resolves the development UI advisories. However, Vitest 3 introduces breaking changes to test transforms in Node 22+. Upgrading to Vitest 3 should be conducted in a scheduled maintenance cycle with full regression testing.
2. **Never Run `npm audit fix --force`:** Blindly executing `--force` causes breaking major-version upgrades across ESLint and Next.js, breaking build pipelines.
3. **Container Minimization:** The production `Dockerfile` already uses a multi-stage build that copies only `.next/standalone` and necessary node_modules, ensuring no test tools or development dependencies enter production containers.
