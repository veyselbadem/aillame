/**
 * Aillame Desktop Readiness & Runtime Acceptance Bridge Smoke Test (Post-Beta Phase 9)
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

console.log("Running Desktop Readiness & Runtime Acceptance Smoke Tests...\n");

const readinessModelPath = path.join(process.cwd(), 'src/core/desktop-readiness/models.ts');
const bootStrategyPath = path.join(process.cwd(), 'src/core/desktop-readiness/boot-strategy.ts');
const acceptanceServicePath = path.join(process.cwd(), 'src/core/runtime/acceptance/acceptance-service.ts');
const apiRoutePath = path.join(process.cwd(), 'src/app/api/aillame/desktop/readiness/route.ts');

check("Desktop Readiness models define v2 structure", () => {
  if (!fs.existsSync(readinessModelPath)) return "models.ts missing";
  const content = fs.readFileSync(readinessModelPath, 'utf8');
  if (!content.includes('DesktopReadinessReport')) return "Missing DesktopReadinessReport";
  if (!content.includes('runtimeAcceptance')) return "Missing runtimeAcceptance field";
  return true;
});

check("Boot Strategy defines local server plan", () => {
  if (!fs.existsSync(bootStrategyPath)) return "boot-strategy.ts missing";
  const content = fs.readFileSync(bootStrategyPath, 'utf8');
  if (!content.includes('LocalServerBootPlan')) return "Missing LocalServerBootPlan";
  if (!content.includes('startupCommandPreview')) return "Missing startupCommandPreview";
  return true;
});

check("Acceptance Service aggregates text and image status", () => {
  if (!fs.existsSync(acceptanceServicePath)) return "acceptance-service.ts missing";
  const content = fs.readFileSync(acceptanceServicePath, 'utf8');
  if (!content.includes('textReady')) return "Missing textReady check";
  if (!content.includes('imageReady')) return "Missing imageReady check";
  return true;
});

check("Desktop Readiness API route exists", () => {
  if (!fs.existsSync(apiRoutePath)) return "Desktop Readiness API missing";
  const content = fs.readFileSync(apiRoutePath, 'utf8');
  if (!content.includes('RuntimeAcceptanceService.getReport()')) return "Missing acceptance report call";
  return true;
});

check("Admin UI has Desktop Readiness visibility", () => {
  const uiPath = path.join(process.cwd(), 'src/app/admin/desktop-readiness/page.tsx');
  if (!fs.existsSync(uiPath)) return "Desktop Readiness UI page missing";
  const content = fs.readFileSync(uiPath, 'utf8');
  if (!content.includes('Desktop Readiness')) return "Missing title";
  return true;
});

check("Acceptance Smoke scripts are registered", () => {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.scripts['smoke:live-text-runtime']) return "Missing smoke:live-text-runtime";
  if (!pkg.scripts['smoke:live-image-runtime']) return "Missing smoke:live-image-runtime";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
