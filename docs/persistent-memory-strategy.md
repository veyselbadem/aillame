# Aillame Persistent Memory Strategy

## 1. Short-term (Current Foundation)
- All memory and vector stores are currently **In-Memory** for Phase 1-4 tests.
- We will transition to a local **JSONL / File-Store** strategy for Beta to avoid heavy dependencies while retaining state across restarts.

## 2. Medium-term (Production Desktop)
- Transition to a lightweight embedded database.
- **SQLite** is the preferred choice for Project Memory metadata and relational queries (e.g., via `better-sqlite3` or Prisma later, but minimal is better).
- **Embedded Vector Store**: Using a small in-process vector library (e.g., HNSW implementation in Node or Rust layer) to avoid external DB services.

## 3. Pluggable Vector Store
- We will implement a `PersistentVectorStoreAdapter` interface.
- This allows swapping out the implementation without changing the foundation logic (e.g., using local Faiss or a Rust-based worker).

## 4. Project Isolation
- All persistence logic MUST partition data by `projectId`.
- Cross-project data leaks are considered a critical severity issue.

## 5. Backup & Restore
- Since data is localized to the user's machine, we will provide a `export/import` utility (potentially via the CLI: `aillame memory export`).

## 6. Security & Sensitive Data Policy
- Persistent memory will run through the `SensitiveMemoryGuard` BEFORE hitting the disk.
- Tokens, keys, and passwords should be rejected or redacted.
