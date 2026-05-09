import fs from 'fs';
import path from 'path';

function fail(message: string): never {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

const filePath = path.join(process.cwd(), 'src', 'components', 'MessageItem.tsx');
const source = fs.readFileSync(filePath, 'utf8');

const checks = [
  {
    name: 'MessageItem is a client component',
    ok: source.startsWith("'use client';"),
  },
  {
    name: 'Uses navigator.clipboard.writeText',
    ok: /navigator\.clipboard\?\.writeText|navigator\.clipboard\.writeText/.test(source),
  },
  {
    name: 'Clipboard access is SSR-safe',
    ok: source.includes("typeof navigator === 'undefined'") || source.includes('typeof navigator === "undefined"'),
  },
  {
    name: 'Copy button has accessible label',
    ok: source.includes('aria-label='),
  },
  {
    name: 'Copy and success icons are present',
    ok: source.includes('FiCopy') && source.includes('FiCheck'),
  },
  {
    name: 'Button is positioned in message top-right',
    ok: /absolute\s+top-3\s+right-3/.test(source),
  },
  {
    name: 'Copy control is available for fallback and normal messages',
    ok: (source.match(/onClick=\{handleCopy\}/g) || []).length >= 2,
  },
];

console.log('Running Chat Copy UI Smoke Test...\n');

for (const check of checks) {
  console.log(` - ${check.name}: ${check.ok ? 'PASS' : 'FAIL'}`);
  if (!check.ok) fail(check.name);
}

console.log('\nFinal Result: PASS');
