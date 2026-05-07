/**
 * Aillame Code Agent Patch Workflow Smoke Test (Post-Beta Phase 4)
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

console.log("Running Code Agent Patch Workflow Smoke Tests...\n");

const workflowServicePath = path.join(process.cwd(), 'src/core/agent/code-agent/patch-workflow-service.ts');
const approvalGatePath = path.join(process.cwd(), 'src/core/agent/code-agent/approval-gate.ts');
const patchApplyPath = path.join(process.cwd(), 'src/core/agent/code-agent/patch-apply-service.ts');
const verifierServicePath = path.join(process.cwd(), 'src/core/agent/code-agent/verifier-service.ts');
const patchFormatterPath = path.join(process.cwd(), 'src/core/agent/code-agent/patch-formatter.ts');

check("Patch workflow service exists and has orchestration logic", () => {
  if (!fs.existsSync(workflowServicePath)) return "patch-workflow-service.ts missing";
  const content = fs.readFileSync(workflowServicePath, 'utf8');
  if (!content.includes('createWorkflow')) return "Missing createWorkflow";
  if (!content.includes('approveWorkflow')) return "Missing approveWorkflow";
  if (!content.includes('applyWorkflow')) return "Missing applyWorkflow";
  return true;
});

check("Approval gate service handles tokens and state", () => {
  if (!fs.existsSync(approvalGatePath)) return "approval-gate.ts missing";
  const content = fs.readFileSync(approvalGatePath, 'utf8');
  if (!content.includes('requestApproval')) return "Missing requestApproval";
  if (!content.includes('validateToken')) return "Missing validateToken";
  if (!content.includes('approve')) return "Missing approve";
  return true;
});

check("Patch apply service has path and risk guards", () => {
  if (!fs.existsSync(patchApplyPath)) return "patch-apply-service.ts missing";
  const content = fs.readFileSync(patchApplyPath, 'utf8');
  if (!content.includes('process.cwd()')) return "Missing path confinement check";
  if (!content.includes('riskLevel === "blocked"')) return "Missing risk guard";
  if (!content.includes('dry-run')) return "Missing dry-run mode";
  return true;
});

check("Verifier service implements allowlist and safety", () => {
  if (!fs.existsSync(verifierServicePath)) return "verifier-service.ts missing";
  const content = fs.readFileSync(verifierServicePath, 'utf8');
  if (!content.includes('ALLOWLIST')) return "Missing allowlist";
  if (!content.includes('blockedPatterns')) return "Missing shell operators block";
  if (!content.includes('validateCommand')) return "Missing validation logic";
  return true;
});

check("Patch formatter handles sensitive content redaction", () => {
  if (!fs.existsSync(patchFormatterPath)) return "patch-formatter.ts missing";
  const content = fs.readFileSync(patchFormatterPath, 'utf8');
  if (!content.includes('redactSecrets')) return "Missing secret redaction";
  if (!content.includes('isSensitiveFile')) return "Missing sensitive file detection";
  return true;
});

check("Admin UI has patch workflow visibility", () => {
  const uiPath = path.join(process.cwd(), 'src/app/admin/agent-tasks/page.tsx');
  const content = fs.readFileSync(uiPath, 'utf8');
  if (!content.includes('Proposed Changes')) return "Missing patch preview header";
  if (!content.includes('Approval Flow & Safety')) return "Missing approval UI section";
  return true;
});

check("API endpoints for patch workflow exist", () => {
  const routes = [
    'src/app/api/admin/code-agent/workflows/route.ts',
    'src/app/api/admin/code-agent/workflows/[workflowId]/[action]/route.ts'
  ];
  for (const r of routes) {
    if (!fs.existsSync(path.join(process.cwd(), r))) return `Route missing: ${r}`;
  }
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
