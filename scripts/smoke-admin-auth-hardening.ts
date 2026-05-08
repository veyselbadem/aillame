import fs from "fs";
import path from "path";

const routes = [
  "src/app/api/admin/api-keys/route.ts",
  "src/app/api/admin/api-keys/[keyId]/revoke/route.ts",
  "src/app/api/admin/models/active/route.ts",
  "src/app/api/admin/models/download/jobs/route.ts",
  "src/app/api/admin/models/download/jobs/[jobId]/approve/route.ts",
  "src/app/api/admin/models/download/jobs/[jobId]/cancel/route.ts",
  "src/app/api/admin/models/download/plan/route.ts",
  "src/app/api/admin/documents/route.ts",
  "src/app/api/admin/documents/ingest/route.ts",
  "src/app/api/admin/security/status/route.ts",
  "src/app/api/admin/models/catalog/route.ts",
  "src/app/api/admin/models/installed/route.ts",
  "src/app/api/admin/release/report/route.ts",
  "src/app/api/admin/image/assets/route.ts",
  "src/app/api/admin/image/jobs/route.ts",
  "src/app/api/admin/ai-lab/readiness/route.ts",
];

const results = routes.map((route) => {
  const content = fs.readFileSync(path.join(process.cwd(), route), "utf-8");
  const hasAuth = content.includes("validateAdminRequest") || content.includes("AILLAME_ADMIN_TOKEN");
  const hasUnauthorized = content.includes("Unauthorized") || content.includes("createAdminAuthErrorResponse");
  const hasTodo = content.includes("TODO: Add admin auth check");
  return { name: route, ok: hasAuth && hasUnauthorized && !hasTodo };
});

console.log("Admin Auth Hardening Results:");
console.log(JSON.stringify({ success: results.every((item) => item.ok), results }, null, 2));

if (results.some((item) => !item.ok)) process.exit(1);
