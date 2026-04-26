import { NextRequest, NextResponse } from 'next/server';
import { installManagedModel } from '@core/model-management/downloader';
import { getAllModelInstallStatuses } from '@core/model-management/status';

export async function GET() {
  return NextResponse.json({ models: getAllModelInstallStatuses() });
}

export async function POST(req: NextRequest) {
  try {
    const { action, modelId } = await req.json();

    if (action !== 'install') {
      return NextResponse.json({ error: 'Unsupported model action.' }, { status: 400 });
    }

    if (!modelId || typeof modelId !== 'string') {
      return NextResponse.json({ error: 'modelId is required.' }, { status: 400 });
    }

    const result = await installManagedModel(modelId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Model action failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
