/**
 * Aillame Beta UI Smoke Test (Phase Beta UI Integration)
 * Validates the UI integration of the Phase 5 productization foundation.
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

console.log("Running Beta UI Integration Smoke Tests...\n");

const dashboardPath = path.join(process.cwd(), 'src/app/admin/dashboard/page.tsx');
const apiClientsPath = path.join(process.cwd(), 'src/app/admin/api-clients/page.tsx');
const memoryCardsPath = path.join(process.cwd(), 'src/app/admin/memory-cards/page.tsx');
const agentTasksPath = path.join(process.cwd(), 'src/app/admin/agent-tasks/page.tsx');

check("Dashboard page contains Beta Checklist and CLI Usage", () => {
  if (!fs.existsSync(dashboardPath)) return "Dashboard file missing";
  const content = fs.readFileSync(dashboardPath, 'utf8');
  if (!content.includes('Beta Readiness Checklist')) return "Missing Beta Checklist";
  if (!content.includes('CLI Usage')) return "Missing CLI Usage";
  return true;
});

check("API Clients page contains Security and Audit Foundation UI", () => {
  if (!fs.existsSync(apiClientsPath)) return "API Clients file missing";
  const content = fs.readFileSync(apiClientsPath, 'utf8');
  if (!content.includes('Security & Permission Foundation')) return "Missing Security UI";
  if (!content.includes('Audit Log & Rate Limit Visibility')) return "Missing Audit UI";
  return true;
});

check("Memory Cards page contains Persistence Strategy", () => {
  if (!fs.existsSync(memoryCardsPath)) return "Memory Cards file missing";
  const content = fs.readFileSync(memoryCardsPath, 'utf8');
  if (!content.includes('Persistence Strategy (Phase 5 Foundation)')) return "Missing Persistence Strategy";
  return true;
});

check("Agent Tasks page maintains plan-only text", () => {
  if (!fs.existsSync(agentTasksPath)) return "Agent Tasks file missing";
  const content = fs.readFileSync(agentTasksPath, 'utf8').toLowerCase();
  if (!content.includes('plan-only')) return "Missing plan-only terminology";
  if (!content.includes('approval-gated')) return "Missing approval-gated terminology";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
