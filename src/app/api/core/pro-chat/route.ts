import { NextRequest, NextResponse } from 'next/server';
import { PRO_CHAT_MODEL_ID, getModel } from '@core/models/registry';
import { getAllModelInstallStatuses } from '@core/model-management/status';
import { generateProMultimodalResponse } from '@core/inference/pro-multimodal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt = '', action, images = [], maxTokens = 512, temperature = 0.7 } = body;
    const model = getModel(PRO_CHAT_MODEL_ID);

    if (action === 'load') {
      return NextResponse.json({
        status: 'ready',
        modelId: model.id,
        repoId: model.repoId,
        capabilities: model.capabilities,
        install: getAllModelInstallStatuses().find((s: any) => s.modelId === model.id),
      });
    }

    if (process.env.AILLAME_QWEN_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'Qwen provider is disabled. Enable AILLAME_QWEN_ENABLED=true for this optional heavy model.' },
        { status: 403 }
      );
    }

    const response = await generateProMultimodalResponse({
      prompt,
      images,
      maxTokens,
      temperature,
    });

    return NextResponse.json({
      response,
      modelId: model.id,
      repoId: model.repoId,
      engine: model.runtime,
    });
  } catch (error) {
    console.error('API Pro-Chat Error:', error);
    const message = error instanceof Error ? error.message : 'Qwen3-VL Pro chat failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
