/**
 * Aillame Beta Release Candidate Smoke Test (Post-Beta Phase 10)
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

console.log("Running Beta Release Candidate Smoke Tests...\n");

const releaseModelPath = path.join(process.cwd(), 'src/core/release/release-types.ts');
const releaseServicePath = path.join(process.cwd(), 'src/core/release/release-service.ts');
const releaseDocPath = path.join(process.cwd(), 'docs/releases/beta-foundation-rc.md');
const apiRoutePath = path.join(process.cwd(), 'src/app/api/admin/release/report/route.ts');
const uiPath = path.join(process.cwd(), 'src/app/admin/release-candidate/page.tsx');

check("Release models define Beta RC structure", () => {
  if (!fs.existsSync(releaseModelPath)) return "release-types.ts missing";
  const content = fs.readFileSync(releaseModelPath, 'utf8');
  if (!content.includes('BetaReleaseCandidateReport')) return "Missing BetaReleaseCandidateReport";
  if (!content.includes('blockers')) return "Missing blockers";
  return true;
});

check("Release Service implements checklists", () => {
  if (!fs.existsSync(releaseServicePath)) return "release-service.ts missing";
  const content = fs.readFileSync(releaseServicePath, 'utf8');
  if (!content.includes('security')) return "Missing security checklist";
  if (!content.includes('rag')) return "Missing RAG checklist";
  if (!content.includes('overallStatus')) return "Missing overallStatus logic";
  return true;
});

check("Beta RC documentation exists and covers LLM/IGM", () => {
  if (!fs.existsSync(releaseDocPath)) return "beta-foundation-rc.md missing";
  const content = fs.readFileSync(releaseDocPath, 'utf8');
  if (!content.includes('Final Kabul Kriterleri')) return "Missing final acceptance criteria";
  if (!content.includes('LLM')) return "Missing LLM mention";
  if (!content.includes('IGM')) return "Missing IGM mention";
  return true;
});

check("Admin UI has Beta RC visibility", () => {
  if (!fs.existsSync(uiPath)) return "Release Candidate UI page missing";
  const content = fs.readFileSync(uiPath, 'utf8');
  if (!content.includes('Beta Release Candidate')) return "Missing title";
  return true;
});

check("QA and RC Smoke scripts are registered", () => {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.scripts['qa:beta']) return "Missing qa:beta script";
  if (!pkg.scripts['smoke:beta-rc']) return "Missing smoke:beta-rc script";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
