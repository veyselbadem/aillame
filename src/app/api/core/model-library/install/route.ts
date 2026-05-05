import { NextRequest, NextResponse } from 'next/server';
import { prepareModelInstall } from '@core/model-library';
import type { ModelRuntimeKind } from '@core/model-library';

export const runtime = 'nodejs';

const RUNTIME_KINDS: ModelRuntimeKind[] = [
  'gguf',
  'ollama',
  'safetensors',
  'diffusers',
  'comfyui',
  'unknown',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const runtimeCandidate = typeof body?.expectedRuntime === 'string' ? body.expectedRuntime : '';
    const expectedRuntime = RUNTIME_KINDS.includes(runtimeCandidate as ModelRuntimeKind)
      ? (runtimeCandidate as ModelRuntimeKind)
      : undefined;

    const result = prepareModelInstall({
      modelId: typeof body?.modelId === 'string' ? body.modelId : '',
      sourceUrl: typeof body?.sourceUrl === 'string' ? body.sourceUrl : undefined,
      expectedRuntime,
      targetDirectory: typeof body?.targetDirectory === 'string' ? body.targetDirectory : undefined,
      dryRun: body?.dryRun !== false,
    });

    const statusCode = result.ok ? 200 : result.reason === 'invalid_request' ? 400 : 200;
    return NextResponse.json({ success: result.ok, data: result, error: result.ok ? undefined : result.message }, { status: statusCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Model install hazırlığı başarısız.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
