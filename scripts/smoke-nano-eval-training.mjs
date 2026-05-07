/**
 * Aillame Nano Evaluation & Training Pipeline Smoke Test (Post-Beta Phase 6)
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

console.log("Running Nano Eval & Training Pipeline Smoke Tests...\n");

const evalRunnerPath = path.join(process.cwd(), 'scripts/evaluate-nano-pipeline.mjs');
const exportScriptPath = path.join(process.cwd(), 'scripts/export-nano-training-candidates.mjs');
const validatorScriptPath = path.join(process.cwd(), 'scripts/validate-nano-training-candidates.mjs');

check("Evaluation Runner supports multi-project reporting", () => {
  if (!fs.existsSync(evalRunnerPath)) return "evaluate-nano-pipeline.mjs missing";
  const content = fs.readFileSync(evalRunnerPath, 'utf8');
  if (!content.includes('byProject')) return "Missing byProject reporting";
  if (!content.includes('expectedDecision')) return "Missing decision validation";
  return true;
});

check("Feedback Export ignores unapproved candidates", () => {
  if (!fs.existsSync(exportScriptPath)) return "export-nano-training-candidates.mjs missing";
  const content = fs.readFileSync(exportScriptPath, 'utf8');
  if (!content.includes("reviewStatus === 'approved'")) return "Risk: exports unapproved feedback";
  return true;
});

check("Training Validator detects potential secrets", () => {
  if (!fs.existsSync(validatorScriptPath)) return "validate-nano-training-candidates.mjs missing";
  const content = fs.readFileSync(validatorScriptPath, 'utf8');
  if (!content.includes('secretPatterns')) return "Missing secret detection logic";
  return true;
});

check("Admin UI has Nano Eval visibility", () => {
  const uiPath = path.join(process.cwd(), 'src/app/admin/intelligence/page.tsx');
  const content = fs.readFileSync(uiPath, 'utf8');
  if (!content.includes('Evaluation Pipeline v1')) return "Missing Eval UI";
  if (!content.includes('Training Pipeline & Feedback Loop')) return "Missing Training UI";
  return true;
});

check("Dataset Schema includes scoring and safety labels", () => {
  const schemaPath = path.join(process.cwd(), 'data/nano/schema.json');
  const content = fs.readFileSync(schemaPath, 'utf8');
  if (!content.includes('scoringRubric')) return "Missing scoringRubric in schema";
  if (!content.includes('safetyLabel')) return "Missing safetyLabel in schema";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
