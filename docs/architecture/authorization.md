# Authorization & Multi-Tenant Isolation

## Role-Based Access Control (RBAC)

LostLink 2.0 defines three primary system roles:

| Role | Scope | Capabilities |
|---|---|---|
| `STUDENT` | Individual / College | Report lost/found items, file claims, participate in handovers, message other students. |
| `COLLEGE_ADMIN` | College Tenant | Review college items & claims, manage campus locations, confirm custody handovers, view analytics. |
| `PLATFORM_ADMIN` | Global Platform | Onboard new universities, manage college statuses, inspect audit logs, manage distributed matching workers. |

---

## Strict Tenant Isolation

Tenant isolation is enforced strictly on the server:

```typescript
// Enforce tenant boundary
export function requireCollegeMembership(user: AuthenticatedUser, collegeId: string) {
  if (user.role === 'PLATFORM_ADMIN') return;
  
  const hasMembership = user.memberships.some(
    (m) => m.collegeId === collegeId && m.status === 'VERIFIED'
  );
  
  if (!hasMembership) {
    throw new AuthorizationError('You do not have verified membership in this institution.');
  }
}
```

### Protection Rules
1. **Never Trust Client Claims:** Never rely on headers, request bodies, or client state for `role`, `collegeId`, or `isVerified`. The authenticated user object is loaded directly from the database session.
2. **Horizontal Privilege Prevention:** A `COLLEGE_ADMIN` for College A cannot query, update, or approve items, claims, or students from College B.
3. **Suspended Account Enforcement:** Any user with `status: SUSPENDED` is rejected with HTTP 403 on all protected endpoints immediately.
4. **Audit Trail Logging:** All administrative actions (approvals, rejections, tenant creations, user status changes) are written to the append-only `AuditLog` table.
