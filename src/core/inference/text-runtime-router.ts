import { getInternalTextRuntimeConfig } from '@core/internal-text-runtime/config';
import {
  getUnifiedInternalTextRuntimeStatus,
  runInternalTextGeneration,
} from '@core/internal-text-runtime/text-runtime-router';
import type {
  InternalTextGenerationRequest,
  InternalTextGenerationResponse,
  InternalTextRuntimeStatus,
} from '@core/internal-text-runtime/model-types';

export function isInternalTextRuntimeEnabled(): boolean {
  return getInternalTextRuntimeConfig().enabled;
}

export async function generateWithTextRuntimeRouter(
  request: InternalTextGenerationRequest,
): Promise<InternalTextGenerationResponse> {
  return runInternalTextGeneration(request);
}

export async function getTextRuntimeRouterStatus(): Promise<InternalTextRuntimeStatus> {
  return getUnifiedInternalTextRuntimeStatus();
}
