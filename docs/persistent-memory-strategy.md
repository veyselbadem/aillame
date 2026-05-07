# Aillame Persistent Memory Strategy

## 1. Short-term (Current Foundation)
- We have implemented local **JSONL / File-Store** adapters for Project Memory, Vector Memory, and Audit Log in Post-Beta Phase 1.
- Data is written to the `.aillame-data` directory by default, configurable via `AILLAME_DATA_DIR`.
- All writes are appended, and read operations aggregate the file into memory.

## 2. Medium-term (Production Desktop)
- Transition to a lightweight embedded database.
- **SQLite** is the preferred choice for Project Memory metadata and relational queries (e.g., via `better-sqlite3` or Prisma later, but minimal is better).
- **Embedded Vector Store**: Using a small in-process vector library (e.g., HNSW implementation in Node or Rust layer) to avoid external DB services.

## 3. Pluggable Vector Store
- We have implemented a `VectorStoreAdapter` interface.
- The current implementation is `VectorMemoryFileStore`, which uses deterministic Cosine Similarity and JSONL storage.

## 4. Project Isolation
- All persistence logic MUST partition data by `projectId`.
- Cross-project data leaks are considered a critical severity issue. Project filters are enforced at the File-Store level.

## 5. Backup & Restore
- The storage policy foundation defines `BackupRequest`, `RestoreRequest`, and `DeletePolicy` (soft delete default, hard delete requires dangerous flag).

## 6. Security & Sensitive Data Policy
- Persistent memory will run through the `SensitiveMemoryGuard` BEFORE hitting the disk.
- Tokens, keys, and passwords are automatically redacted (e.g., `[REDACTED]`) before being written to the JSONL files.
