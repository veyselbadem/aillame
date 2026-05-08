/**
 * UI cleanup smoke guard for the AI Lab role alignment pass.
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
    if (result === true) {
      checks.push({ name, ok: true, detail: 'Passed' });
    } else {
      checks.push({ name, ok: false, detail: result });
      failed = true;
    }
  } catch (error) {
    checks.push({ name, ok: false, detail: error.message });
    failed = true;
  }
}

console.log('Running UI cleanup smoke tests...\n');

const aiLab = read('src/app/admin/ai-lab/page.tsx');
const sidebar = read('src/components/Sidebar.tsx');
const chatShell = read('src/components/ChatShell.tsx');
const statusBadge = read('src/components/ui/StatusBadge.tsx');
const release = read('src/app/admin/release-candidate/page.tsx');
const readme = read('README.md');
const pkg = JSON.parse(read('package.json'));

check('Aillame Lab is positioned as evaluation playground', () => {
  if (!aiLab.includes('Compatibility Lab')) return 'Compatibility Lab title missing.';
  if (!aiLab.includes('güvenli deney ve değerlendirme alanı')) return 'Evaluation role copy missing.';
  if (aiLab.includes('AI Laboratory')) return 'Old AI Laboratory title returned.';
  return true;
});

check('Sidebar uses Local AI Hub information architecture', () => {
  for (const label of ['Yönetim', 'Ayarlar', 'Kontrol Merkezi', 'Modeller', 'Görseller', 'Code Agent', 'Hafıza / RAG', 'Provider API']) {
    if (!sidebar.includes(label)) return `Missing sidebar group: ${label}`;
  }
  if (!sidebar.includes('Compatibility Lab')) return 'Compatibility Lab nav label missing.';
  return true;
});

check('ChatShell keeps primary context and moves diagnostics behind details', () => {
  if (!chatShell.includes('ProjectContextSurface')) return 'ProjectContextSurface missing.';
  if (!chatShell.includes('Detaylar')) return 'Details toggle missing.';
  if (!chatShell.includes('Attribution')) return 'Attribution diagnostic text missing.';
  if (chatShell.includes('Safe Fallback')) return 'Badge clutter returned.';
  return true;
});

check('StatusBadge supports shared status vocabulary', () => {
  for (const variant of ['ready', 'degraded', 'not-configured', 'planned', 'info', 'neutral']) {
    if (!statusBadge.includes(variant)) return `Missing status variant: ${variant}`;
  }
  return true;
});

check('Release page preserves runtime acceptance transparency', () => {
  if (!release.includes('Beta Foundation RC ve Live Runtime Acceptance ayrı izlenir')) return 'Foundation vs acceptance copy missing.';
  if (!release.includes('Live Runtime Kabulü')) return 'Live Runtime Kabulü copy missing.';
  if (!release.includes('NOT_CONFIGURED')) return 'NOT_CONFIGURED transparency missing.';
  return true;
});

check('README documents UI role separation', () => {
  if (!readme.includes('UI Rol Ayrımı')) return 'README UI role section missing.';
  if (!readme.includes('Aillame Lab, deney/evaluation/playground alanıdır')) return 'README Lab role missing.';
  return true;
});

check('Cleaned UI files do not contain mojibake markers', () => {
  const combined = [aiLab, sidebar, chatShell, statusBadge, release, readme].join('\n');
  return /[ÃÄÅ�]/.test(combined) ? 'Mojibake marker found in cleaned UI files.' : true;
});

check('UI cleanup script is registered', () => {
  return pkg.scripts?.['smoke:ui-cleanup'] === 'node scripts/smoke-ui-cleanup.mjs'
    ? true
    : 'Missing smoke:ui-cleanup package script.';
});

console.log(JSON.stringify({ success: !failed, checks }, null, 2));

if (failed) process.exit(1);
