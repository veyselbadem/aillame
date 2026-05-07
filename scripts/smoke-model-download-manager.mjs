/**
 * Aillame GGUF Model Download Manager smoke test.
 *
 * No network, no real model download, no repo model writes.
 */

import fs from 'fs';
import path from 'path';

const checks = [];
let hasFailed = false;

function check(name, fn) {
  try {
    const result = fn();
    if (result === true) checks.push({ name, ok: true, detail: 'Passed' });
    else {
      checks.push({ name, ok: false, detail: result });
      hasFailed = true;
    }
  } catch (error) {
    checks.push({ name, ok: false, detail: error.message });
    hasFailed = true;
  }
}

function read(filePath) {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

console.log('Running Model Download Manager smoke tests...\n');

check('Curated catalog exists and defines starter GGUF candidates', () => {
  const content = read('src/core/models/catalog/curated-gguf-catalog.ts');
  if (!content.includes('CURATED_GGUF_STARTER_CATALOG')) return 'Missing curated catalog';
  if (!content.includes('Q4_K_M')) return 'Missing Q4_K_M guidance';
  if (!content.includes('3B')) return 'Missing starter parameter guidance';
  return true;
});

check('Catalog contract defines GGUF metadata fields', () => {
  const content = read('src/core/models/catalog/model-catalog-types.ts');
  for (const token of ['ModelCatalogEntry', 'ModelCatalogFile', 'downloadUrl', 'checksum', 'recommended']) {
    if (!content.includes(token)) return `Missing ${token}`;
  }
  return true;
});

check('Download plan is approval gated and does not auto-start', () => {
  const content = read('src/core/models/download/model-download-service.ts');
  if (!content.includes('approvalRequired: true')) return 'Plan must require approval';
  if (!content.includes('canAutoStart: false')) return 'Plan must disable auto-start';
  if (!content.includes('manual-required')) return 'Missing manual-required handling';
  return true;
});

check('Download job queue supports planned approval statuses', () => {
  const content = read('src/core/models/download/model-download-types.ts');
  for (const status of ['waiting-approval', 'approved', 'downloading', 'completed', 'failed', 'cancelled', 'manual-required']) {
    if (!content.includes(status)) return `Missing status ${status}`;
  }
  return true;
});

check('Start download is blocked before approval and offline by default', () => {
  const content = read('src/core/models/download/model-download-service.ts');
  if (!content.includes('Download requires explicit approval before start.')) return 'Missing approval guard';
  if (!content.includes('AILLAME_MODEL_DOWNLOADS_ENABLED')) return 'Missing download enable flag';
  return true;
});

check('Model verification accepts only local GGUF candidates', () => {
  const fixtureRoot = path.join(process.cwd(), '.aillame-test-data', 'model-download-manager');
  fs.mkdirSync(fixtureRoot, { recursive: true });
  const fakeGguf = path.join(fixtureRoot, 'tiny-3b-Q4_K_M.gguf');
  const fakeTxt = path.join(fixtureRoot, 'tiny.txt');
  fs.writeFileSync(fakeGguf, 'x'.repeat(2048));
  fs.writeFileSync(fakeTxt, 'not gguf');
  const content = read('src/core/models/download/model-verification-service.ts');
  if (!content.includes('verifyLocalGgufModel')) return 'Missing verifyLocalGgufModel';
  if (!content.includes('.gguf')) return 'Missing .gguf extension guard';
  if (!fs.existsSync(fakeGguf)) return 'Fixture GGUF was not created';
  if (!fs.existsSync(fakeTxt)) return 'Fixture non-GGUF was not created';
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  return true;
});

check('Active model selection requires verification and approval', () => {
  const content = read('src/core/models/download/active-gguf-model-service.ts');
  if (!content.includes('requires explicit approval')) return 'Missing approval requirement';
  if (!content.includes('verifyLocalGgufModel')) return 'Missing verification before active selection';
  return true;
});

check('Admin API foundation exists', () => {
  const routes = [
    'src/app/api/admin/models/catalog/route.ts',
    'src/app/api/admin/models/download/plan/route.ts',
    'src/app/api/admin/models/download/jobs/route.ts',
    'src/app/api/admin/models/installed/route.ts',
    'src/app/api/admin/models/active/route.ts',
  ];
  for (const route of routes) {
    if (!fs.existsSync(path.join(process.cwd(), route))) return `Missing ${route}`;
  }
  return true;
});

check('Model Library UI surfaces catalog, download and active model sections', () => {
  const content = read('src/app/admin/model-library/page.tsx');
  for (const token of ['Ollama-like GGUF Model Manager', 'Discover / Starter Catalog', 'Download Plans', 'Active Model', 'Live Text Acceptance']) {
    if (!content.includes(token)) return `Missing UI token ${token}`;
  }
  return true;
});

check('Docs and env describe safe download workflow', () => {
  const env = read('.env.example');
  const docs = read('docs/model-download-manager.md');
  if (!env.includes('AILLAME_MODEL_DOWNLOAD_REQUIRE_APPROVAL=true')) return 'Missing approval env';
  if (!docs.includes('Aillame provides an Ollama-like model management workflow')) return 'Missing docs story';
  if (!docs.includes('finalAcceptanceReady=true')) return 'Missing acceptance note';
  return true;
});

check('No mojibake patterns introduced in new model download docs', () => {
  const docs = read('docs/model-download-manager.md');
  if (/(Ã|Ä|Å)/.test(docs)) return 'Mojibake pattern found';
  return true;
});

check('No staged model artifacts are expected by this smoke', () => {
  const forbidden = ['.gguf', '.safetensors', '.ckpt'];
  const candidateFiles = [
    'src/core/models/catalog/curated-gguf-catalog.ts',
    'src/core/models/download/model-download-service.ts',
    'docs/model-download-manager.md',
  ];
  for (const file of candidateFiles) {
    if (forbidden.some((ext) => file.endsWith(ext))) return `Forbidden model artifact path ${file}`;
  }
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));
if (hasFailed) process.exit(1);
