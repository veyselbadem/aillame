import { NextRequest, NextResponse } from 'next/server';
import { validateExternalClientRequest } from '@/core/external-auth/client-auth';
import { RuntimeAcceptanceService } from '@/core/runtime/acceptance/acceptance-service';

export async function GET(req: NextRequest) {
  const authResult = await validateExternalClientRequest(req);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const report = RuntimeAcceptanceService.getReport();

  const models = [
    {
      id: report.text?.selectedModelId || 'gemma-local',
      type: 'llm',
      name: 'Aillame Local Text',
      description: 'GGUF-based local text generation',
      status: report.text?.status === 'ready' ? 'active' : 'inactive'
    },
    {
      id: 'sdxl-turbo-local', // Image report doesn't currently expose modelId directly in report object, using baseline
      type: 'igm',
      name: 'Aillame Local Image',
      description: 'SDXL Turbo local image generation',
      status: report.image?.status === 'ready' ? 'active' : 'inactive',
      device: report.image?.deviceDetails || 'Local'
    }
  ];

  return NextResponse.json({
    success: true,
    provider: 'aillame-local',
    models
  });
}
