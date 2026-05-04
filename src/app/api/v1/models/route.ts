import { NextRequest, NextResponse } from 'next/server';
import { validateExternalClientRequest } from '@core/external-auth/client-auth';
import { getModelsWithStatus } from '@core/models/model-manager';
import { toOpenAIModelList } from '@core/external-api/openai-mapper';
import { jsonOpenAIError } from '@core/external-api/error-format';
import type { ManagedModel } from '@core/models/types';

function isChatCompatibleModel(model: ManagedModel): boolean {
  if (model.enabled === false) return false;

  const supportsChat = model.capabilities.includes('chat')
    || model.capabilities.includes('instruct')
    || model.capabilities.includes('code');
  const chatPurpose = model.purpose === 'chat';
  const typeSupported = model.type === undefined || model.type === 'text' || model.type === 'multimodal';

  return supportsChat && chatPurpose && typeSupported;
}

export async function GET(request: NextRequest) {
  const authResult = await validateExternalClientRequest(request);
  if (!authResult.success || !authResult.client) {
    return jsonOpenAIError(authResult.error || 'Unauthorized external client request.', 'unauthorized', authResult.statusCode || 401);
  }

  try {
    const compatibleModels = (await getModelsWithStatus())
      .filter((entry) => entry.status !== 'disabled')
      .map((entry) => entry.model)
      .filter((model) => isChatCompatibleModel(model));

    return NextResponse.json(toOpenAIModelList(compatibleModels), { status: 200 });
  } catch {
    return jsonOpenAIError('Internal server error.', 'internal_error', 500);
  }
}
