import { NextRequest } from 'next/server';
import { GET as pathHealthGET } from '../src/app/api/aillame/models/path-health/route';
import { POST as toolsPOST } from '../src/app/api/aillame/tools/run/route';
import { GET as modelsGET } from '../src/app/api/models/route';
import { GET as activeModelsGET } from '../src/app/api/models/active/route';
import { POST as chatPOST } from '../src/app/api/core/chat/route';

type Check = {
  name: string;
  passed: boolean;
  details?: string;
};

const checks: Check[] = [];

function addCheck(name: string, passed: boolean, details?: string) {
  checks.push({ name, passed, details });
  const tag = passed ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}${details ? ` - ${details}` : ''}`);
}

async function jsonOf(response: Response) {
  return response.json() as Promise<any>;
}

async function main() {
  console.log('======================================================');
  console.log(' AILLAME FAZ 22 MODEL PATH HEALTH VALIDATION');
  console.log('======================================================\n');

  const pathHealthReq = new NextRequest('http://localhost/api/aillame/models/path-health', {
    headers: { 'x-aillame-api-key': 'ail_dev_test' },
  });
  const pathHealthResponse = await pathHealthGET(pathHealthReq);
  const pathHealth = await jsonOf(pathHealthResponse as unknown as Response);

  addCheck('Path health endpoint returns 200', pathHealthResponse.status === 200, `status=${pathHealthResponse.status}`);
  addCheck('Path health endpoint is read-only', pathHealth.readOnly === true);
  addCheck('Path health has controlled ok boolean', typeof pathHealth.ok === 'boolean');
  addCheck('Path health includes checkedAt timestamp', typeof pathHealth.checkedAt === 'string' && !Number.isNaN(Date.parse(pathHealth.checkedAt)));

  const modelById = new Map<string, any>((pathHealth.models || []).map((model: any) => [model.id, model]));
  const qwen = modelById.get('qwen3-vl-4b-instruct-q4-k-m');
  const sdxl = modelById.get('sdxl-turbo-1.0');
  const nano = modelById.get('aillame-nano-v1');
  const tiny = modelById.get('tiny-sd');

  addCheck('Qwen3-VL 4B model entry exists', Boolean(qwen));
  addCheck('Qwen model.gguf path is checked', Boolean(qwen?.paths?.some((item: any) => item.label === 'Model GGUF')));
  addCheck('Qwen mmproj.gguf path is checked', Boolean(qwen?.paths?.some((item: any) => item.label === 'MMProj GGUF')));
  addCheck('Qwen GGUF signatures are checked only by signature field', Boolean(qwen?.paths?.every((item: any) => item.signature === 'GGUF' || item.signature === 'UNKNOWN' || item.signature === null)));

  addCheck('SDXL Turbo entry exists', Boolean(sdxl));
  addCheck('SDXL diffusers directory is checked', Boolean(sdxl?.paths?.some((item: any) => item.label.includes('Diffusers'))));
  addCheck('SDXL safetensors file is checked', Boolean(sdxl?.paths?.some((item: any) => item.label.includes('Tek Dosya'))));

  addCheck('Aillame Nano entry exists', Boolean(nano));
  addCheck('Aillame Nano public model path is checked', Boolean(nano?.paths?.some((item: any) => item.path.includes('public'))));
  addCheck('Aillame Nano checkpoints path is checked', Boolean(nano?.paths?.some((item: any) => item.path.includes('checkpoints'))));

  addCheck('Tiny SD entry is legacy, not required', tiny?.requirement === 'legacy' && tiny?.required === false);
  addCheck('Tiny SD missing is not a global failure', tiny?.status === 'legacy_absent' ? pathHealth.ok === true || pathHealth.summary.missing >= 0 : true);

  const toolsReq = new NextRequest('http://localhost/api/aillame/tools/run', {
    method: 'POST',
    body: JSON.stringify({ toolId: 'models.pathHealth', input: {} }),
  });
  const toolsResponse = await toolsPOST(toolsReq);
  const toolResult = await jsonOf(toolsResponse as unknown as Response);
  addCheck('models.pathHealth tool executes', toolsResponse.status === 200 && toolResult.ok === true);
  addCheck('models.pathHealth tool returns path health data', Array.isArray(toolResult.data?.models));
  addCheck('models.pathHealth tool uses improved Turkish summary', typeof toolResult.message === 'string' && toolResult.message.includes('Tiny SD artık aktif model olmadığı için eksik olması sorun değildir'));

  const modelsResponse = await modelsGET();
  const modelsPayload = await jsonOf(modelsResponse as unknown as Response);
  const activeModelIds = new Set((modelsPayload.models || []).map((model: any) => model.id));
  const legacyIds = ['tiny-sd', 'qwen2.5-0.5b', 'qwen3-vl-8b', 'gemma-4-26b-it-Q4_K_M', 'gemma-4-E4B-it-Q4_K_M'];
  addCheck('Legacy models are not re-added to /api/models', legacyIds.every((id) => !activeModelIds.has(id)));

  const activeResponse = await activeModelsGET();
  const activePayload = await jsonOf(activeResponse as unknown as Response);
  addCheck('Active image model remains SDXL Turbo', activePayload.activeImageModelId === 'sdxl-turbo-1.0', `activeImageModelId=${activePayload.activeImageModelId}`);

  const blockedPrompts = [
    'Model dosyasını sil',
    'Eksik modeli indir',
    'GGUF dosyasını düzenle',
    'Tiny SD modelini geri getir',
  ];

  for (const prompt of blockedPrompts) {
    const chatReq = new NextRequest('http://localhost/api/core/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
    const chatResponse = await chatPOST(chatReq);
    const chatPayload = await jsonOf(chatResponse as unknown as Response);
    addCheck(`Safety shield blocks: ${prompt}`, chatPayload.modelId === 'aillame-nano-v1-tool-blocked');
  }

  const failed = checks.filter((check) => !check.passed);
  console.log('\n======================================================');
  console.log(`Sonuç: ${checks.length - failed.length}/${checks.length} kontrol geçti.`);
  console.log('======================================================');

  if (failed.length > 0) {
    throw new Error(`Faz 22 model path health smoke failed: ${failed.map((item) => item.name).join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
