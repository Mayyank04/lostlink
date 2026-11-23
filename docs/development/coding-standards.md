# Coding Standards & Best Practices

## 1. TypeScript Strictness
- Strict type-checking is enabled (`strict: true` in `tsconfig.json`).
- Avoid using `any`. Use strict interfaces, generics, or `unknown` with type narrowing.
- All domain entity types reside under `src/types/`.

---

## 2. Server vs Client Boundaries
- Mark client components explicitly with `'use client';` at the top of the file.
- Keep data-fetching, heavy logic, and database operations in React Server Components or `src/server/services/`.
- Never import `src/lib/db` or `src/server/` into client components.

---

## 3. Security First
- Always validate input with Zod schemas.
- Always authenticate users with `requireAuth(req)` before processing requests.
- Always enforce tenant checks with `requireCollegeMembership(user, collegeId)`.
- Never return sensitive data (hashes, tokens, secrets) in API responses.

---

## 4. UI Quality Standard (Human-Quality Frontend)
- Adhere strictly to rules in [DESIGN.md](../../DESIGN.md).
- Avoid decorative AI artifacts (floating glowing blur blobs, rainbow cards, meaningless counters).
- Maintain WCAG AA contrast (minimum 4.5:1 text, 3:1 graphical elements).
- Support responsive viewports from mobile (360px) to desktop (1440px).
