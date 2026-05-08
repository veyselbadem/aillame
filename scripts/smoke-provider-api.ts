import fs from 'fs';
import path from 'path';
import { normalizeProjectId } from '../src/core/provider-api/project-context';
import { validateProviderApiRequest } from '../src/core/provider-api/validation';

async function main() {
  console.log("Running Provider API Smoke Tests...\n");

  const results = [];

  // 1. Check Files
  const requiredFiles = [
    'src/core/provider-api/types.ts',
    'src/core/provider-api/project-context.ts',
    'src/core/provider-api/validation.ts',
    'src/core/provider-api/provider-service.ts',
    'src/app/api/provider/v1/generate/route.ts',
    'src/app/api/provider/v1/status/route.ts',
    'src/app/api/provider/v1/models/route.ts',
    'docs/aillame-provider-api.md'
  ];

  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    results.push({ name: `File exists: ${file}`, ok: exists });
  }

  // 2. Test Project ID Normalization
  const testIds = [
    { in: 'BOSS AI', out: 'boss-ai' },
    { in: 'Doomsgame Engine', out: 'doomsgame-engine' },
    { in: '  Project_Name  ', out: 'project-name' },
    { in: 'Invalid@#$Chars', out: 'invalid-chars' },
    { in: '', out: 'default' },
    { in: undefined, out: 'default' }
  ];

  for (const t of testIds) {
    const normalized = normalizeProjectId(t.in as any);
    results.push({ 
      name: `ProjectId normalization: ${t.in} -> ${normalized}`, 
      ok: normalized === t.out 
    });
  }

  // 3. Test Request Validation
  const validTextBody = {
    projectId: 'test-proj',
    mode: 'text',
    prompt: 'Hello'
  };
  results.push({ name: 'Validate valid text request', ok: validateProviderApiRequest(validTextBody).success === true });

  const validImageBody = {
    projectId: 'test-proj',
    mode: 'image',
    prompt: 'A dragon'
  };
  results.push({ name: 'Validate valid image request', ok: validateProviderApiRequest(validImageBody).success === true });

  const invalidBody = {
    mode: 'image'
    // missing projectId
  };
  results.push({ name: 'Validate invalid request (missing projectId)', ok: validateProviderApiRequest(invalidBody).success === false });

  const quickstart = fs.readFileSync(path.join(process.cwd(), 'docs/provider-integration-quickstart.md'), 'utf-8');
  const providerDoc = fs.readFileSync(path.join(process.cwd(), 'docs/aillame-provider-api.md'), 'utf-8');
  const providerTypes = fs.readFileSync(path.join(process.cwd(), 'src/core/provider-api/types.ts'), 'utf-8');
  results.push({ name: 'Docs: Quickstart uses mode field', ok: quickstart.includes('"mode": "text"') && quickstart.includes('"mode": "image"') });
  results.push({ name: 'Docs: Quickstart avoids legacy type/input schema', ok: !quickstart.includes('"type": "text"') && !quickstart.includes('"input"') });
  results.push({ name: 'Docs: Provider response avoids absolute Windows path', ok: !/C:\\\\/.test(providerDoc) });
  results.push({ name: 'API: Provider response type avoids path field', ok: !providerTypes.includes('path?: string') });

  // 4. Summary
  const allOk = results.every(r => r.ok);
  console.log(JSON.stringify({ success: allOk, results }, null, 2));

  if (!allOk) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
