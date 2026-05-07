/**
 * Aillame Security & API Key Management Smoke Test (Post-Beta Phase 2)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

console.log("Running Security & API Key Smoke Tests...\n");

const apiKeyServicePath = path.join(process.cwd(), 'src/core/security/api-key-service.ts');
const apiKeyStorePath = path.join(process.cwd(), 'src/core/security/api-key-file-store.ts');
const permissionServicePath = path.join(process.cwd(), 'src/core/security/permission-service.ts');
const authGuardPath = path.join(process.cwd(), 'src/core/security/external-api-auth.ts');
const rateLimitServicePath = path.join(process.cwd(), 'src/core/security/rate-limit-service.ts');

check("API Key Service implements hashing and masking", () => {
  if (!fs.existsSync(apiKeyServicePath)) return "api-key-service.ts missing";
  const content = fs.readFileSync(apiKeyServicePath, 'utf8');
  if (!content.includes('createHmac')) return "Hashing (createHmac) not implemented";
  if (!content.includes('maskKey')) return "Key masking not implemented";
  if (!content.includes('plaintextKey')) return "Missing create result pattern";
  return true;
});

check("API Key File Store handles persistence", () => {
  if (!fs.existsSync(apiKeyStorePath)) return "api-key-file-store.ts missing";
  const content = fs.readFileSync(apiKeyStorePath, 'utf8');
  if (!content.includes('api-keys.jsonl')) return "Wrong filename pattern";
  if (!content.includes('readJsonl') || !content.includes('writeJsonl')) return "Does not use JSONL storage";
  return true;
});

check("Permission Service handles scope and project isolation", () => {
  if (!fs.existsSync(permissionServicePath)) return "permission-service.ts missing";
  const content = fs.readFileSync(permissionServicePath, 'utf8');
  if (!content.includes('checkPermission')) return "checkPermission missing";
  if (!content.includes('projectId')) return "Project isolation logic missing";
  if (!content.includes('requiredScope')) return "Scope check logic missing";
  return true;
});

check("External API Auth Guard implements header check and audit", () => {
  if (!fs.existsSync(authGuardPath)) return "external-api-auth.ts missing";
  const content = fs.readFileSync(authGuardPath, 'utf8');
  if (!content.includes('Authorization') && !content.includes('x-aillame-api-key')) return "Header detection missing";
  if (!content.includes('auditStore.appendAuditEvent')) return "Audit logging missing";
  return true;
});

check("Rate Limit Service provides identifier-based limiting", () => {
  if (!fs.existsSync(rateLimitServicePath)) return "rate-limit-service.ts missing";
  const content = fs.readFileSync(rateLimitServicePath, 'utf8');
  if (!content.includes('checkLimit')) return "checkLimit missing";
  if (!content.includes('InMemoryRateLimiter')) return "In-memory store missing";
  return true;
});

check("Admin Endpoints for security exist", () => {
  const routes = [
    'src/app/api/admin/api-keys/route.ts',
    'src/app/api/admin/security/status/route.ts'
  ];
  for (const r of routes) {
    if (!fs.existsSync(path.join(process.cwd(), r))) return `Route missing: ${r}`;
  }
  return true;
});

check("SDK supports API key headers", () => {
  const sdkPath = path.join(process.cwd(), 'src/core/sdk/aillame-client.ts');
  const content = fs.readFileSync(sdkPath, 'utf8');
  if (!content.includes('Authorization') || !content.includes('Bearer')) return "Missing bearer token support";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
