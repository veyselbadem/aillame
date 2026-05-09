import fs from 'fs';
import path from 'path';

const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'core', 'chat', 'route.ts');
const liveRuntimePath = path.join(process.cwd(), 'scripts', 'live-runtime-acceptance-lib.mjs');
const route = fs.readFileSync(routePath, 'utf8');
const liveRuntime = fs.readFileSync(liveRuntimePath, 'utf8');

const checks = [
  {
    name: 'Chat route builds runtime attribution',
    ok: route.includes('buildRuntimeAttribution') && route.includes('runtimeAttribution'),
  },
  {
    name: 'Attribution exposes provider/model/runtime',
    ok: ['provider', 'modelId', 'runtime'].every((field) => route.includes(field)),
  },
  {
    name: 'Attribution exposes fallback/degraded flags',
    ok: route.includes('fallbackUsed') && route.includes('degraded'),
  },
  {
    name: 'Nano direct responses include attribution',
    ok: route.includes('nano-quality-direct') && route.includes('nano-cognitive-general-knowledge'),
  },
  {
    name: 'IGM handoff includes attribution',
    ok: route.includes('aillame-igm') && route.includes('igm-image-generation-service'),
  },
  {
    name: 'Fallback/error responses include degraded attribution',
    ok: route.includes('nano-safe-fallback') && route.includes('nano-error-fallback'),
  },
  {
    name: 'Live text runtime reports fallback/degraded metadata',
    ok: liveRuntime.includes('fallbackUsed') && liveRuntime.includes('degraded') && liveRuntime.includes('selectedModelId'),
  },
];

console.log('Running Chat Runtime Attribution Smoke Test...\n');
const failures = checks.filter((check) => !check.ok);

for (const check of checks) {
  console.log(` - ${check.name}: ${check.ok ? 'PASS' : 'FAIL'}`);
}

if (failures.length > 0) {
  console.error('\nFinal Result: FAIL');
  failures.forEach((failure) => console.error(` - ${failure.name}`));
  process.exit(1);
}

console.log('\nFinal Result: PASS');
