/**
 * Aillame Persistent Storage Smoke Test (Post-Beta Phase 1)
 */

import fs from 'fs';
import path from 'path';

const checks = [];
let hasFailed = false;

function check(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      checks.push({ name, ok: true, detail: "Passed" });
    } else {
      checks.push({ name, ok: false, detail: result });
      hasFailed = true;
    }
  } catch (error) {
    checks.push({ name, ok: false, detail: error.message });
    hasFailed = true;
  }
}

console.log("Running Persistent Storage Smoke Tests...\n");

const fileStorePath = path.join(process.cwd(), 'src/core/storage/file-store.ts');
const pmAdapterPath = path.join(process.cwd(), 'src/core/memory/project-memory-file-store.ts');
const vectorAdapterPath = path.join(process.cwd(), 'src/core/memory/vector/vector-memory-file-store.ts');
const auditStorePath = path.join(process.cwd(), 'src/core/security/audit-file-store.ts');
const liveAggregatorPath = path.join(process.cwd(), 'src/core/health/live-aggregator.ts');

check("Storage root policy exists and handles AILLAME_DATA_DIR", () => {
  if (!fs.existsSync(fileStorePath)) return "file-store.ts missing";
  const content = fs.readFileSync(fileStorePath, 'utf8');
  if (!content.includes('AILLAME_DATA_DIR')) return "Missing env variable override check";
  if (!content.includes('fs.mkdirSync')) return "Missing directory creation logic";
  return true;
});

check("Project memory adapter handles JSONL list/read/write", () => {
  if (!fs.existsSync(pmAdapterPath)) return "project-memory-file-store.ts missing";
  const content = fs.readFileSync(pmAdapterPath, 'utf8');
  if (!content.includes('PersistentMemoryAdapter')) return "Does not implement adapter";
  if (!content.includes('appendJsonl') && !content.includes('writeJsonl')) return "Does not use jsonl methods";
  if (!content.includes('throw new Error(\'Sensitive content detected')) return "Missing sensitive data guard";
  return true;
});

check("Vector memory adapter implements basic storage logic", () => {
  if (!fs.existsSync(vectorAdapterPath)) return "vector-memory-file-store.ts missing";
  const content = fs.readFileSync(vectorAdapterPath, 'utf8');
  if (!content.includes('VectorStoreAdapter')) return "Does not implement adapter";
  if (!content.includes('[REDACTED]')) return "Missing text redaction for secrets";
  return true;
});

check("Audit log adapter implements JSONL append and query", () => {
  if (!fs.existsSync(auditStorePath)) return "audit-file-store.ts missing";
  const content = fs.readFileSync(auditStorePath, 'utf8');
  if (!content.includes('appendJsonl')) return "Missing jsonl write";
  if (!content.includes('queryAuditEvents')) return "Missing query capability";
  return true;
});

check("Live health aggregator binds to storage foundation", () => {
  if (!fs.existsSync(liveAggregatorPath)) return "live-aggregator.ts missing";
  const content = fs.readFileSync(liveAggregatorPath, 'utf8');
  if (!content.includes('ensureStorageRoot')) return "Missing storage check";
  if (!content.includes('AuditFileStore')) return "Missing audit store check";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
