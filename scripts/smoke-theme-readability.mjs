/**
 * Theme readability smoke guard for the post-RC theme pass.
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

console.log('Running theme readability smoke tests...\n');

const globals = read('src/globals.css');
const statusBadge = read('src/components/ui/StatusBadge.tsx');
const chatShell = read('src/components/ChatShell.tsx');
const modelLibrary = read('src/app/admin/model-library/page.tsx');
const documents = read('src/app/admin/documents/page.tsx');
const imageAssets = read('src/app/admin/image-assets/page.tsx');
const desktopReadiness = read('src/app/admin/desktop-readiness/page.tsx');
const releaseCandidate = read('src/app/admin/release-candidate/page.tsx');
const aiLab = read('src/app/admin/ai-lab/page.tsx');
const pkg = JSON.parse(read('package.json'));

const themedPages = {
  'model-library': modelLibrary,
  documents,
  'image-assets': imageAssets,
  'desktop-readiness': desktopReadiness,
  'release-candidate': releaseCandidate,
};

check('Semantic theme primitives exist', () => {
  for (const token of ['--bg-elevated', '--text-secondary', '--border', '.theme-shell', '.theme-surface', '.theme-input', '.theme-callout-warning']) {
    if (!globals.includes(token)) return `Missing theme primitive: ${token}`;
  }
  return true;
});

check('Key admin pages no longer use hardcoded dark page shells', () => {
  for (const [name, content] of Object.entries(themedPages)) {
    if (content.includes('bg-[#050505]')) return `${name} still uses bg-[#050505]`;
    if (content.includes('bg-zinc-950')) return `${name} still uses bg-zinc-950 shell`;
    if (!content.includes('theme-shell')) return `${name} missing theme-shell`;
    if (!content.includes('theme-surface')) return `${name} missing theme-surface`;
  }
  return true;
});

check('StatusBadge uses readable light and dark text tones', () => {
  for (const variant of ['ready', 'degraded', 'not-configured', 'planned', 'info', 'neutral']) {
    if (!statusBadge.includes(variant)) return `Missing status variant: ${variant}`;
  }
  if (!statusBadge.includes('text-slate-900')) return 'Light neutral badge text is not strong enough.';
  if (!statusBadge.includes('dark:text-slate-200')) return 'Dark neutral badge text is not strong enough.';
  return true;
});

check('Chat context surface uses semantic theme classes', () => {
  if (!chatShell.includes('theme-soft-panel')) return 'Project context surface missing theme-soft-panel.';
  if (!chatShell.includes('theme-surface rounded-xl')) return 'Diagnostic detail cards are not themed.';
  if (chatShell.includes('bg-slate-950/45')) return 'Old dark context surface returned.';
  return true;
});

check('Aillame Lab cards are themed and role copy remains intact', () => {
  if (!aiLab.includes('Compatibility Lab')) return 'Compatibility Lab title missing.';
  if (!aiLab.includes('güvenli deney ve değerlendirme alanı')) return 'Aillame Lab role copy missing.';
  if (!aiLab.includes('theme-surface rounded-2xl')) return 'Aillame Lab summary cards are not themed.';
  return true;
});

check('No mojibake markers in theme-critical files', () => {
  const combined = [globals, statusBadge, chatShell, modelLibrary, documents, imageAssets, desktopReadiness, releaseCandidate, aiLab].join('\n');
  return /[ÃƒÃ„Ã…ï¿½]/.test(combined) ? 'Mojibake marker found in theme-critical files.' : true;
});

check('Theme readability script is registered', () => {
  return pkg.scripts?.['smoke:theme-readability'] === 'node scripts/smoke-theme-readability.mjs'
    ? true
    : 'Missing smoke:theme-readability package script.';
});

console.log(JSON.stringify({ success: !failed, checks }, null, 2));

if (failed) process.exit(1);
