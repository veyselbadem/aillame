import { NextRequest, NextResponse } from 'next/server';
import {
  createExternalApiResponseHeaders,
  validateExternalApiRequest,
} from '@core/external-api/auth';
import { getModelsWithStatus } from '@core/models/model-manager';
import { jsonOpenAIError } from '@core/external-api/error-format';
import type { ManagedModel } from '@core/models/types';
import { listLocalModels } from '@core/model-library';
import { buildExternalApiModelList } from '@core/model-library/openai-models';

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
  const authResult = await validateExternalApiRequest(request);
  if (!authResult.success || !authResult.client) {
    return jsonOpenAIError(
      authResult.error || 'Unauthorized external client request.',
      'unauthorized',
      authResult.statusCode || 401,
      createExternalApiResponseHeaders(authResult),
    );
  }

  try {
    const compatibleModels = (await getModelsWithStatus())
      .filter((entry) => entry.status !== 'disabled')
      .map((entry) => entry.model)
      .filter((model) => isChatCompatibleModel(model));

    let localModels: ReturnType<typeof listLocalModels> = [];
    try {
      localModels = listLocalModels();
    } catch {
      // model-library failure must not break the v1/models endpoint
    }

    return NextResponse.json(
      buildExternalApiModelList(compatibleModels, localModels),
      { status: 200, headers: createExternalApiResponseHeaders(authResult) },
    );
  } catch {
    return jsonOpenAIError('Internal server error.', 'internal_error', 500);
  }
}
