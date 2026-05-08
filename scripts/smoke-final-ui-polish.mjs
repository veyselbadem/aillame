/**
 * Final UI polish smoke guard for remaining admin/developer surfaces.
 */

import fs from 'fs';
import path from 'path';

const checks = [];
let failed = false;

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

function check(name, fn) {
  try {
    const result = fn();
    if (result === true) checks.push({ name, ok: true, detail: 'Passed' });
    else {
      checks.push({ name, ok: false, detail: result });
      failed = true;
    }
  } catch (error) {
    checks.push({ name, ok: false, detail: error.message });
    failed = true;
  }
}

console.log('Running final UI polish smoke tests...\n');

const pkg = JSON.parse(read('package.json'));
const globals = read('src/globals.css');

const criticalPages = {
  'memory-cards': read('src/app/admin/memory-cards/page.tsx'),
  'memory-write-queue': read('src/app/admin/memory-write-queue/page.tsx'),
  'agent-tasks': read('src/app/admin/agent-tasks/page.tsx'),
  'api-clients': read('src/app/admin/api-clients/page.tsx'),
  feedback: read('src/app/admin/feedback/page.tsx'),
  'learning-candidates': read('src/app/admin/learning-candidates/page.tsx'),
  'distillation-preview': read('src/app/admin/distillation-preview/page.tsx'),
  'research-results': read('src/app/admin/research-results/page.tsx'),
  intelligence: read('src/app/admin/intelligence/page.tsx'),
};

check('Admin polish compatibility layer exists', () => {
  for (const token of ['.theme-admin-page', '.admin-polish-card', '.admin-polish-code']) {
    if (!globals.includes(token)) return `Missing ${token}`;
  }
  return true;
});

check('Critical admin pages opt into theme-admin-page', () => {
  for (const [name, content] of Object.entries(criticalPages)) {
    if (!content.includes('theme-admin-page')) return `${name} missing theme-admin-page`;
  }
  return true;
});

check('Nano Eval no longer has a hardcoded dark page shell', () => {
  const content = criticalPages.intelligence;
  if (content.includes('bg-[#050505]')) return 'Nano Eval still has bg-[#050505].';
  if (!content.includes('Aillame Intelligence')) return 'Nano Eval title missing.';
  if (!content.includes('Nano Evaluation Pipeline')) return 'Nano Evaluation Pipeline copy missing.';
  return true;
});

check('Memory and queue pages keep expected product labels', () => {
  if (!criticalPages['memory-cards'].includes('Hafıza Kartları')) return 'Memory cards title missing or mojibake returned.';
  if (!criticalPages['memory-write-queue'].includes('Hafıza Yazım Kuyruğu')) return 'Memory queue title missing or mojibake returned.';
  if (!criticalPages['distillation-preview'].includes('Damıtma Önizlemeleri')) return 'Distillation title missing.';
  return true;
});

check('Provider, feedback, research and agent surfaces keep core headings', () => {
  const expected = [
    ['api-clients', 'API Anahtarları ve Güvenlik'],
    ['feedback', 'Feedback Dataset Yönetimi'],
    ['research-results', 'Araştırma Sonuçları'],
    ['agent-tasks', 'Code Agent'],
    ['learning-candidates', 'Öğrenme Adayları'],
  ];
  for (const [name, label] of expected) {
    if (!criticalPages[name].includes(label)) return `${name} missing ${label}`;
  }
  return true;
});

check('Critical page titles avoid common mojibake markers', () => {
  const expectedLabels = [
    'Hafıza Kartları',
    'Hafıza Yazım Kuyruğu',
    'Code Agent',
    'API Anahtarları ve Güvenlik',
    'Feedback Dataset Yönetimi',
    'Öğrenme Adayları',
    'Damıtma Önizlemeleri',
    'Araştırma Sonuçları',
    'Aillame Intelligence',
  ];
  for (const label of expectedLabels) {
    const found = Object.values(criticalPages).some((content) => content.includes(label));
    if (!found) return `Expected readable label missing: ${label}`;
  }
  return true;
});

check('Final UI polish script is registered', () => {
  return pkg.scripts?.['smoke:final-ui-polish'] === 'node scripts/smoke-final-ui-polish.mjs'
    ? true
    : 'Missing smoke:final-ui-polish package script.';
});

console.log(JSON.stringify({ success: !failed, checks }, null, 2));

if (failed) process.exit(1);
