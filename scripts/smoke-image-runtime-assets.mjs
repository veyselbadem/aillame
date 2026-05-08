/**
 * Aillame Image Runtime & Asset Manager Smoke Test (Post-Beta Phase 8)
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

console.log("Running Image Runtime & Asset Manager Smoke Tests...\n");

const assetTypesPath = path.join(process.cwd(), 'src/core/runtime/image/assets/image-asset-types.ts');
const jobStorePath = path.join(process.cwd(), 'src/core/runtime/image/jobs/image-job-file-store.ts');
const readinessPath = path.join(process.cwd(), 'src/core/runtime/image/igm-runtime-readiness.ts');
const workerPath = path.join(process.cwd(), 'src/core/runtime/image/worker/igm-worker-contract.ts');

check("Image Asset types define metadata attributes", () => {
  if (!fs.existsSync(assetTypesPath)) return "image-asset-types.ts missing";
  const content = fs.readFileSync(assetTypesPath, 'utf8');
  if (!content.includes('ImageAssetRecord')) return "Missing ImageAssetRecord";
  if (!content.includes('fileName')) return "Missing fileName";
  if (!content.includes('prompt')) return "Missing prompt";
  return true;
});

check("Job Store supports history persistence", () => {
  if (!fs.existsSync(jobStorePath)) return "image-job-file-store.ts missing";
  const content = fs.readFileSync(jobStorePath, 'utf8');
  if (!content.includes('ImageJobRecord')) return "Missing ImageJobRecord";
  if (!content.includes('addJob')) return "Missing addJob method";
  return true;
});

check("Readiness Service defines acceptance criteria", () => {
  if (!fs.existsSync(readinessPath)) return "igm-runtime-readiness.ts missing";
  const content = fs.readFileSync(readinessPath, 'utf8');
  if (!content.includes('finalAcceptanceReady')) return "Missing finalAcceptanceReady logic";
  if (!content.includes('AILLAME_IGM_RUNTIME_ENABLED')) return "Missing env check";
  return true;
});

check("Worker Contract defines generation interface", () => {
  if (!fs.existsSync(workerPath)) return "igm-worker-contract.ts missing";
  const content = fs.readFileSync(workerPath, 'utf8');
  if (!content.includes('IGMWorkerRequest')) return "Missing IGMWorkerRequest";
  if (!content.includes('generate')) return "Missing generate method";
  return true;
});

check("API Routes for image jobs and assets exist", () => {
  const jobsApi = path.join(process.cwd(), 'src/app/api/admin/image/jobs/route.ts');
  const assetsApi = path.join(process.cwd(), 'src/app/api/admin/image/assets/route.ts');
  if (!fs.existsSync(jobsApi)) return "Jobs API missing";
  if (!fs.existsSync(assetsApi)) return "Assets API missing";
  return true;
});

check("Admin UI has Image Asset Manager visibility", () => {
  const uiPath = path.join(process.cwd(), 'src/app/admin/image-assets/page.tsx');
  if (!fs.existsSync(uiPath)) return "Image Asset Manager UI page missing";
  const content = fs.readFileSync(uiPath, 'utf8');
  if (!content.includes('Görsel') || !content.includes('Varlıkları')) return "Missing title";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
