import { NextRequest, NextResponse } from 'next/server';
import { appendRuntimeModelEvent } from '@core/ai-lab/runtime-event-log';
import { preflightGemmaModelSwitch } from '@core/local-runtime/gemma-model-preflight';

export const runtime = 'nodejs';

type GemmaSwitchPreflightBody = {
  modelId?: unknown;
  localPath?: unknown;
  dryRun?: unknown;
};

function unauthorized(): NextResponse {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

function validateAdminToken(req: NextRequest): boolean {
  return req.headers.get('x-aillame-admin-token') === process.env.AILLAME_ADMIN_TOKEN;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!validateAdminToken(req)) return unauthorized();

  let payload: GemmaSwitchPreflightBody;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (payload?.dryRun !== true) {
    return NextResponse.json({ success: false, error: 'Only dryRun=true is supported.' }, { status: 400 });
  }

  if (payload.modelId !== undefined && typeof payload.modelId !== 'string') {
    return NextResponse.json({ success: false, error: 'modelId must be a string when provided.' }, { status: 400 });
  }

  if (payload.localPath !== undefined && typeof payload.localPath !== 'string') {
    return NextResponse.json({ success: false, error: 'localPath must be a string when provided.' }, { status: 400 });
  }

  if (!payload.modelId && !payload.localPath) {
    return NextResponse.json({ success: false, error: 'modelId or localPath is required.' }, { status: 400 });
  }

  try {
    const result = await preflightGemmaModelSwitch({
      modelId: typeof payload.modelId === 'string' ? payload.modelId : undefined,
      localPath: typeof payload.localPath === 'string' ? payload.localPath : undefined,
      dryRun: true,
      expectedRuntime: 'gguf',
    });

    appendRuntimeModelEvent({
      type: 'preflight',
      provider: 'gemma',
      requestedModelId: result.modelId,
      selectedModelId: result.ok ? result.modelId : undefined,
      ok: result.ok,
      reason: result.reason,
      source: 'admin-gemma-switch-preflight',
    });

    return NextResponse.json({ success: true, data: result }, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Gemma switch preflight could not be completed.' },
      { status: 500 },
    );
  }
}