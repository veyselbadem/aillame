import { NextRequest, NextResponse } from 'next/server';
import { installManagedModel } from '@core/model-management/downloader';
import { getAllModelInstallStatuses } from '@core/model-management/status';
import { removeLocalModel } from '@core/model-library';

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
      // For removal, we use the model library service directly
      // This handles both Ollama and local files.
      const result = await removeLocalModel({
        modelId,
        confirmDelete: true,
        dryRun: false
      });
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
