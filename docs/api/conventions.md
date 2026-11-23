# API Conventions & Standards

## 1. RESTful Principles
- All API routes are located under `src/app/api/`.
- Use plural nouns for resources: `/api/items`, `/api/claims`, `/api/colleges`.
- Nest sub-resources logically: `/api/items/[id]/images`, `/api/claims/[id]/dispute`.
- Use appropriate HTTP verbs:
  - `GET`: Read resources without side effects.
  - `POST`: Create a new resource or execute a non-idempotent action.
  - `PATCH`: Partially update an existing resource.
  - `DELETE`: Remove or archive a resource.

---

## 2. Standard Response Format

Successful responses return JSON with `success: true`:

```json
{
  "success": true,
  "data": {
    "id": "item-123",
    "title": "MacBook Air M2",
    "status": "OPEN"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "requestId": "k8s9x2"
  }
}
```

Legacy endpoints return structured entity keys (e.g. `{ item: ... }`, `{ claims: ... }`) while preserving `success: true` for backward compatibility.

---

## 3. Query Parameter Standards
- `page`: 1-based page number (default: 1).
- `limit`: Number of records per page (default: 20, max: 50).
- `search` / `q`: Case-insensitive search query.
- `sort`: Sorting field and direction (e.g., `createdAt_desc`, `name_asc`).
- `collegeId`: Filter by university tenant ID.
- `status`: Filter by resource lifecycle status.
