# API Error Handling

## Error Response Format

Errors are formatted consistently via `apiError(error, req)` or `errorResponse(error)`:

```json
{
  "success": false,
  "error": "You do not have permission to perform this action.",
  "code": "AUTHORIZATION_DENIED",
  "requestId": "e8x21a9c"
}
```

---

## HTTP Status Codes & Error Codes

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request body or parameters failed Zod schema validation. |
| `401` | `AUTHENTICATION_REQUIRED` | Missing, invalid, or expired session cookie. |
| `403` | `AUTHORIZATION_DENIED` | Insufficient role or cross-tenant boundary violation. |
| `404` | `NOT_FOUND` | The requested item, claim, college, or user was not found. |
| `409` | `RESOURCE_CONFLICT` | Resource collision (e.g. duplicate active claim, email already in use). |
| `429` | `RATE_LIMIT_EXCEEDED` | Request threshold exceeded for IP or user. |
| `500` | `INTERNAL_SERVER_ERROR` | Unhandled server exception. Stack traces are suppressed in production. |

---

## Security Error Masking
In production environments (`NODE_ENV=production`), database internals, SQL query traces, and library error stacks are suppressed from API responses to prevent reconnaissance attacks.
