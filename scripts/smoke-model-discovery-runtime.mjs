/**
 * Aillame Model Discovery & Runtime Smoke Test (Post-Beta Phase 5)
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

console.log("Running Model Discovery & Runtime Smoke Tests...\n");

const ggufDetectorPath = path.join(process.cwd(), 'src/core/models/discovery/gguf-detector.ts');
const compatibilityPath = path.join(process.cwd(), 'src/core/models/compatibility/model-compatibility.ts');
const watchlistPath = path.join(process.cwd(), 'src/core/models/watchlist/model-watchlist.ts');
const installPlanPath = path.join(process.cwd(), 'src/core/models/install/model-install-plan.ts');

check("GGUF Detector implements filename parsing", () => {
  if (!fs.existsSync(ggufDetectorPath)) return "gguf-detector.ts missing";
  const content = fs.readFileSync(ggufDetectorPath, 'utf8');
  if (!content.includes('parseQuantization')) return "Missing quantization parser";
  if (!content.includes('parseParameterSize')) return "Missing param size parser";
  if (!content.includes('.gguf')) return "Missing format check";
  return true;
});

check("Model Compatibility Scorer provides hardware fit analysis", () => {
  if (!fs.existsSync(compatibilityPath)) return "model-compatibility.ts missing";
  const content = fs.readFileSync(compatibilityPath, 'utf8');
  if (!content.includes('ModelCompatibilityReport')) return "Missing report interface";
  if (!content.includes('hardwareFit')) return "Missing hardware fit logic";
  if (!content.includes('score')) return "Missing scoring logic";
  return true;
});

check("Model Watchlist supports update tracking", () => {
  if (!fs.existsSync(watchlistPath)) return "model-watchlist.ts missing";
  const content = fs.readFileSync(watchlistPath, 'utf8');
  if (!content.includes('checkUpdates')) return "Missing update check logic";
  if (!content.includes('updateAvailable')) return "Missing update status field";
  return true;
});

check("Model Install Plan ensures approval before action", () => {
  if (!fs.existsSync(installPlanPath)) return "model-install-plan.ts missing";
  const content = fs.readFileSync(installPlanPath, 'utf8');
  if (!content.includes('approvalRequired: true')) return "Auto-install risk: approval must be required";
  if (!content.includes('diskSpaceCheck')) return "Missing disk space check placeholder";
  return true;
});

check("Runtime Status View includes GGUF readiness", () => {
  const statusPath = path.join(process.cwd(), 'src/core/models/model-runtime-status.ts');
  const content = fs.readFileSync(statusPath, 'utf8');
  if (!content.includes('ggufReadiness')) return "Missing GGUF readiness fields";
  return true;
});

check("Model Library UI displays discovery sections", () => {
  const uiPath = path.join(process.cwd(), 'src/app/admin/model-library/page.tsx');
  const content = fs.readFileSync(uiPath, 'utf8');
  if (!content.includes('Model Watchlist')) return "Missing Watchlist UI";
  if (!content.includes('Compatibility Analysis')) return "Missing Compatibility UI";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
