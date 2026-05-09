import { NextRequest, NextResponse } from 'next/server';
import { installManagedModel } from '@core/model-management/downloader';
import { getAllModelInstallStatuses } from '@core/model-management/status';
import { removeLocalModel } from '@core/model-library';
import { readActiveModelSelection, writeActiveModelSelection } from '@core/model-management/active-model-store';

export async function GET() {
  return NextResponse.json({ models: await getAllModelInstallStatuses() });
}

export async function POST(req: NextRequest) {
  try {
    const { action, modelId } = await req.json();

    if (!modelId || typeof modelId !== 'string') {
      return NextResponse.json({ error: 'modelId is required.' }, { status: 400 });
    }

    if (action === 'install') {
      const result = await installManagedModel(modelId);
      return NextResponse.json(result);
    }

    if (action === 'remove') {
      const result = await removeLocalModel({
        modelId,
        confirmDelete: true,
        dryRun: false
      });

      // Clear active selection if the removed model was active
      if (result.ok) {
        const sel = readActiveModelSelection();
        const chatCleared = sel.activeChatModelId === modelId;
        const imageCleared = sel.activeImageModelId === modelId;
        if (chatCleared || imageCleared) {
          writeActiveModelSelection({
            activeChatModelId: chatCleared ? null : sel.activeChatModelId,
            activeImageModelId: imageCleared ? null : sel.activeImageModelId,
          });
        }
      }

      return NextResponse.json({
        success: result.ok,
        message: result.message,
        modelId: result.modelId
      });
    }

    return NextResponse.json({ error: 'Unsupported model action.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Model action failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
