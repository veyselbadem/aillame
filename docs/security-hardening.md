# Aillame Security Hardening (Post-Beta Phase 2)

## API Key Lifecycle
1. **Creation:** Generated via Admin API. Plaintext key is returned only once.
2. **Storage:** Key is hashed using SHA-256 HMAC and stored in `.aillame-data/api-keys.jsonl`.
3. **Verification:** Incoming `Authorization: Bearer <key>` headers are hashed and compared.
4. **Revocation:** Keys can be soft-revoked, marking them as `revoked` in the store.

## Permission Scopes
- `chat:read`: Access to message history.
- `chat:write`: Ability to send chat completions.
- `project:read`: Access to project metadata and listing.
- `memory:read`: Query project/vector memory.
- `memory:write`: Append to project/vector memory.
- `task:create`: Trigger code-agent or image tasks.
- `admin:*`: Internal management (only for admin keys).

## Project Isolation
Keys can be "global" or "project-scoped". 
- Project-scoped keys MUST specify a list of `projectIds` they are authorized for.
- Accessing a different `projectId` will result in a `403 Forbidden` error.

## Rate Limiting
- Default: 60 requests per minute per API key.
- Store: In-memory (resets on application restart).
- Policy: Configurable via `.env`.

## Audit Redaction
The `AuditFileStore` and `ApiKeyService` ensure that:
- Plaintext keys are NEVER logged.
- Secret tokens in request bodies are redacted via regex patterns.
- Masked keys (e.g., `ail_...1234`) are used in diagnostics.
