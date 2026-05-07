/**
 * Aillame External Provider E2E Smoke Test (Post-Beta Phase 3)
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

console.log("Running External Provider E2E Integration Smoke Tests...\n");

const contractsPath = path.join(process.cwd(), 'src/core/integrations/contracts/provider-contract.ts');
const bossAiExamplePath = path.join(process.cwd(), 'src/core/integrations/examples/boss-ai-provider-example.ts');
const doomsgameExamplePath = path.join(process.cwd(), 'src/core/integrations/examples/doomsgame-engine-provider-example.ts');
const bademAkademiExamplePath = path.join(process.cwd(), 'src/core/integrations/examples/badem-akademi-provider-example.ts');

check("Integration contracts are defined", () => {
  if (!fs.existsSync(contractsPath)) return "provider-contract.ts missing";
  const content = fs.readFileSync(contractsPath, 'utf8');
  if (!content.includes('AillameProviderProjectContract')) return "Missing contract interface";
  if (!content.includes('boss-ai') || !content.includes('doomsgame-engine') || !content.includes('badem-akademi')) return "Missing project presets";
  return true;
});

check("BOSS AI provider example is defined", () => {
  if (!fs.existsSync(bossAiExamplePath)) return "boss-ai-provider-example.ts missing";
  const content = fs.readFileSync(bossAiExamplePath, 'utf8');
  if (!content.includes('BOSS_AI_INTEGRATION')) return "Missing integration object";
  if (!content.includes('economy') || !content.includes('market-analysis')) return "Missing economic context";
  return true;
});

check("Doomsgame Engine provider example is defined", () => {
  if (!fs.existsSync(doomsgameExamplePath)) return "doomsgame-engine-provider-example.ts missing";
  const content = fs.readFileSync(doomsgameExamplePath, 'utf8');
  if (!content.includes('DOOMSGAME_ENGINE_INTEGRATION')) return "Missing integration object";
  if (!content.includes('code-plan')) return "Missing code-agent context";
  return true;
});

check("Badem Akademi provider example is defined", () => {
  if (!fs.existsSync(bademAkademiExamplePath)) return "badem-akademi-provider-example.ts missing";
  const content = fs.readFileSync(bademAkademiExamplePath, 'utf8');
  if (!content.includes('BADEM_AKADEMI_INTEGRATION')) return "Missing integration object";
  if (!content.includes('education') || !content.includes('worksheet-generation')) return "Missing education context";
  return true;
});

check("External API routes use Auth Guard and Rate Limit", () => {
  const routes = [
    'src/app/api/external/v1/chat/route.ts',
    'src/app/api/external/v1/projects/[projectId]/chat/route.ts'
  ];
  for (const r of routes) {
    const p = path.join(process.cwd(), r);
    if (!fs.existsSync(p)) return `Route missing: ${r}`;
    const content = fs.readFileSync(p, 'utf8');
    if (!content.includes('externalApiAuthGuard')) return `Missing Auth Guard in ${r}`;
    if (!content.includes('rateLimitService')) return `Missing Rate Limit in ${r}`;
  }
  return true;
});

check("SDK supports integration headers", () => {
  const sdkPath = path.join(process.cwd(), 'src/core/sdk/aillame-client.ts');
  const content = fs.readFileSync(sdkPath, 'utf8');
  if (!content.includes('x-aillame-api-key') || !content.includes('Authorization')) return "Missing auth headers";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
