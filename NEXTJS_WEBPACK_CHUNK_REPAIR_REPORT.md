# LostLink 2.0 — Next.js Missing Webpack Chunk Repair & Architecture Report

## 1. Executive Summary

| Metric | Status |
| :--- | :--- |
| **Error Investigated** | `Error: Cannot find module './9276.js'` |
| **Root Cause** | Process concurrency collision on `.next` between running `next dev` and `next build`, compounded by default Webpack chunk splitting of native server dependencies (`@prisma/client`, `argon2`) |
| **Status** | **Permanently Resolved & Verified** |
| **Routes Validated** | `/api/auth/me`, `/profile`, `/dashboard`, `/auth/login`, `/campus/[slug]/dashboard` |
| **Prisma Validation** | 100% Valid (`npx prisma validate`) |
| **TypeScript Typecheck** | 0 Errors (`npm run typecheck`) |
| **ESLint Quality** | 0 Errors (`npm run lint`) |
| **Production Build** | 58/58 pages compiled successfully (`npm run build`) |
| **Automated Test Suites** | 22/22 passed (230/230 tests green) |

---

## 2. Root Cause Analysis

### The Crash Mechanism
The application crashed with the following error and stack:
```
Error: Cannot find module './9276.js'
Require stack:
- /Users/mayankgautam/Desktop/lostlink/.next/server/webpack-runtime.js
- /Users/mayankgautam/Desktop/lostlink/.next/server/app/api/auth/me/route.js
- /Users/mayankgautam/Desktop/lostlink/node_modules/next/dist/server/require.js
- /Users/mayankgautam/Desktop/lostlink/.next/server/app/profile/page.js
```

### Technical Root Cause Breakdown

1. **Process Collision on `.next` Output Directory**:
   - A `next dev` server process was running in the background on port 3000 (PID 81040/81041).
   - In Next.js development mode, Webpack compiles route modules on demand and configures chunk loading in `.next/server/webpack-runtime.js` as:
     ```js
     installChunk(require("./" + __webpack_require__.u(chunkId)));
     // Looking for ./9276.js directly inside .next/server/
     ```
   - While `next dev` was actively running and serving traffic, a production build (`next build`) was executed in the workspace.
   - `next build` empties and replaces `.next/server/` with production bundles, organizing chunks inside `.next/server/chunks/` (e.g. `.next/server/chunks/9276.js`).
   - The running `next dev` instance maintained its in-memory compilation state and file-system cache (`.next/cache/webpack/server-development`). When a browser or client made a request to `/profile` (which invokes `useAuth()` -> `checkServerSession()` -> `GET /api/auth/me`), the dev server attempted to require chunk `./9276.js` from `.next/server/`, where the dev chunk had been erased and replaced by the production build output.
   - Node's runtime threw `MODULE_NOT_FOUND: Cannot find module './9276.js'`.

2. **Native Module & Server Chunk Fragmentation**:
   - In Next.js 14 App Router, native C++ binaries (`argon2`) and ORMs (`@prisma/client`) should not be bundled by Webpack into dynamic numbered JavaScript chunks.
   - Previously, `next.config.js` was missing `experimental.serverComponentsExternalPackages: ['@prisma/client', 'argon2', '@aws-sdk/client-s3']`. Without this, Webpack traced server dependencies and split them into fragmented numbered chunks (`9276.js`, `5972.js`, etc.), increasing chunk invalidation sensitivity.

3. **Client-Side Fallback Resolution**:
   - Client components importing utilities were not protected with explicit Webpack resolve fallbacks for Node.js built-ins (`fs`, `net`, `tls`, `crypto`), creating risks during code-splitting.

---

## 3. Files Inspected & Modified

### Modified Files:

1. **[next.config.js](file:///Users/mayankgautam/Desktop/lostlink/next.config.js)**
   - Configured `experimental.serverComponentsExternalPackages` for `@prisma/client`, `argon2`, and `@aws-sdk/client-s3`. This instructs Webpack to leave these packages as standard external `require()` statements rather than attempting to chunk them into numbered Webpack artifacts.
   - Added client-side Webpack resolve fallbacks for Node.js built-ins (`fs: false`, `net: false`, `tls: false`, `crypto: false`).

2. **[package.json](file:///Users/mayankgautam/Desktop/lostlink/package.json)**
   - Added `"clean": "rm -rf .next"` script for deterministic cache and artifact resets across CI and local developer environments.

3. **[src/tests/webpack-chunk-session.test.ts](file:///Users/mayankgautam/Desktop/lostlink/src/tests/webpack-chunk-session.test.ts)**
   - Added a dedicated regression test suite verifying:
     - Native `argon2` password hashing and verification without chunk errors.
     - Unauthenticated `GET /api/auth/me` returns HTTP 200 with `{ user: null }`.
     - Authenticated `GET /api/auth/me` with Bearer token successfully resolves session, user, and membership models.
     - Authenticated `GET /api/auth/me` with Cookie header (`lostlink_session`) correctly validates session.
     - Graceful handling of forged/malformed session tokens.

### Inspected Files:
- `src/app/api/auth/me/route.ts` (Ensured `force-dynamic` export and error catching)
- `src/lib/auth/session.ts` (Verified token extraction and session resolution logic)
- `src/app/profile/page.tsx` (Verified client component boundaries and hooks)
- `src/context/AuthContext.tsx` (Verified `checkServerSession()` exception isolation)
- `.next/server/webpack-runtime.js` (Analyzed dev vs prod chunk loader mechanics)

---

## 4. Verification & Validation Results

### A. Static Analysis & Type Checking
```bash
npx prisma validate
# The schema at prisma/schema.prisma is valid 🚀

npm run typecheck
# tsc --noEmit (0 errors)

npm run lint
# 0 errors
```

### B. Production Build
```bash
npm run build
# ▲ Next.js 14.2.35
# ✓ Compiled successfully
# ✓ Generating static pages (58/58)
# Output: standalone bundle generated with zero missing chunk references
```

### C. Live Server Runtime Verification
Executed automated end-to-end HTTP tests against both `next dev` and `next start`:

- **Development Server (`next dev -p 3000`)**:
  - `GET /api/auth/me` -> **HTTP 200** (Compiled in 202ms, `{ "user": null }`)
  - `GET /profile` -> **HTTP 200** (Compiled in 1447ms)
  - `GET /dashboard` -> **HTTP 200** (Compiled in 587ms)
  - `GET /auth/login` -> **HTTP 200** (Compiled in 82ms)

- **Production Standalone Server (`next start -p 3000`)**:
  - `GET /api/auth/me` -> **HTTP 200** (`{ "user": null }`)
  - `GET /profile` -> **HTTP 200**
  - `GET /dashboard` -> **HTTP 200**
  - `GET /auth/login` -> **HTTP 200**

### D. Vitest Test Suite
```bash
npm test
# Test Files  22 passed (22)
# Tests       230 passed (230)
# Duration    4.57s
```

---

## 5. Prevention Guidelines

1. **Avoid Concurrent `dev` and `build` on the same `.next` directory**:
   - Never run `npm run build` while `npm run dev` is running in another terminal window.
   - Always run `npm run clean` (`rm -rf .next`) before creating a production build if a dev server was previously active.
2. **Keep Native Modules in `serverComponentsExternalPackages`**:
   - Any C++ native addons or large server-only database drivers must remain in `experimental.serverComponentsExternalPackages` in `next.config.js`.
3. **Use the `npm run clean` script**:
   - If a build is interrupted or cache state becomes stale, running `npm run clean && npm run build` resets `.next` deterministically.
