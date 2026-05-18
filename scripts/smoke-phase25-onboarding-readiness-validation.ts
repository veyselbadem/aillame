import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { GET as pathHealthGET } from '../src/app/api/aillame/models/path-health/route';
import { GET as portHealthGET } from '../src/app/api/aillame/runtime/port-health/route';

type Check = {
  name: string;
  passed: boolean;
  details?: string;
};

const checks: Check[] = [];

function record(name: string, passed: boolean, details?: string) {
  checks.push({ name, passed, details });
  const tag = passed ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}${details ? ` - ${details}` : ''}`);
}

async function jsonOf(response: Response) {
  return response.json() as Promise<any>;
}

async function main() {
  console.log('======================================================');
  console.log(' AILLAME FAZ 25 ONBOARDING READINESS VALIDATION');
  console.log('======================================================\n');

  const pathHealthResponse = await pathHealthGET(new NextRequest('http://localhost/api/aillame/models/path-health', {
    headers: { 'x-aillame-api-key': 'ail_dev_test' },
  }));
  const pathHealth = await jsonOf(pathHealthResponse as unknown as Response);
  record('Path-health endpoint is accessible', pathHealthResponse.status === 200, `status=${pathHealthResponse.status}`);
  record('Path-health response is read-only', pathHealth.readOnly === true);
  record('Path-health includes model entries', Array.isArray(pathHealth.models) && pathHealth.models.length >= 4);

  const portHealthResponse = await portHealthGET();
  const portHealth = await jsonOf(portHealthResponse as unknown as Response);
  record('Port-health endpoint is accessible', portHealthResponse.status === 200 || portHealthResponse.status === 409, `status=${portHealthResponse.status}`);
  record('Port-health response has JSON shape', typeof portHealth.port === 'number' && typeof portHealth.message === 'string');
  record('Port-health reports owner without killing process', ['available', 'aillame', 'unknown'].includes(portHealth.owner));

  const settingsPath = path.join(process.cwd(), 'src/app/settings/page.tsx');
  const settings = fs.readFileSync(settingsPath, 'utf8');
  record('Settings contains onboarding guide title', settings.includes('İlk Açılış Rehberi'));
  record('Settings contains port status card text', settings.includes('Yerel Sunucu') && settings.includes('Port Durumunu Kontrol Et'));
  record('Settings contains model files card text', settings.includes('Model Dosyaları') && settings.includes('Qwen3-VL 4B') && settings.includes('SDXL Turbo') && settings.includes('Aillame Nano'));
  record('Settings contains Tiny SD legacy message', settings.includes('Tiny SD artık aktif model değildir; eksikliği hata değildir.'));
  record('Settings contains local data safety note', settings.includes('Verileriniz cihazınızda saklanır.'));
  record('Settings notes Clear Chat does not delete memory', settings.includes('Sohbeti Temizle kalıcı hafızayı silmez'));
  record('Settings references support summary action', settings.includes('Destek Özeti Kopyala'));
  record('Settings uses read-only port-health endpoint', settings.includes('/api/aillame/runtime/port-health'));
  record('Settings uses read-only path-health state', settings.includes('/api/aillame/models/path-health'));

  const supportPath = path.join(process.cwd(), 'docs/SUPPORT_AND_TROUBLESHOOTING.md');
  const roadmapPath = path.join(process.cwd(), 'docs/ROADMAP.md');
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  record('Support docs mention onboarding guide', fs.readFileSync(supportPath, 'utf8').includes('İlk Açılış Rehberi'));
  record('Roadmap mentions onboarding readiness', fs.readFileSync(roadmapPath, 'utf8').includes('İlk Açılış Rehberi'));
  record('Changelog mentions onboarding readiness', fs.readFileSync(changelogPath, 'utf8').includes('İlk Açılış Rehberi'));

  const failed = checks.filter(check => !check.passed);
  console.log(`\nSonuç: ${checks.length - failed.length}/${checks.length} kontrol geçti.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
