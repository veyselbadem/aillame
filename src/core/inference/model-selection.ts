export type InferenceModelSelectionSource =
  | 'request'
  | 'default'
  | 'model-library'
  | 'v1-chat';

export type InferenceModelSelectionInput = {
  modelId?: string;
  capability?: string;
  provider?: string;
  runtime?: string;
  source?: InferenceModelSelectionSource;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ensureSafeModelId(modelId?: string | null): string | undefined {
  if (typeof modelId !== 'string') return undefined;

  const trimmed = modelId.trim();
  if (!trimmed) return undefined;

  // Drop path separators/control chars and keep model-safe symbols only.
  const sanitized = trimmed
    .replace(/[\\/\x00-\x1f]/g, '')
    .replace(/[^a-zA-Z0-9:_.\-]/g, '')
    .slice(0, 128);

  return sanitized || undefined;
}

export function getRequestedModelIdFromPayload(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;

  const candidate =
    typeof payload.model === 'string'
      ? payload.model
      : typeof payload.modelId === 'string'
        ? payload.modelId
        : undefined;

  return ensureSafeModelId(candidate);
}

export function normalizeInferenceModelSelection(
  input: Partial<InferenceModelSelectionInput> | unknown,
): InferenceModelSelectionInput {
  if (!isRecord(input)) {
    return { source: 'request' };
  }

  const safeModelId = ensureSafeModelId(
    typeof input.modelId === 'string' ? input.modelId : undefined,
  );

  const source: InferenceModelSelectionSource =
    input.source === 'default'
      ? 'default'
      : input.source === 'model-library'
        ? 'model-library'
        : input.source === 'v1-chat'
          ? 'v1-chat'
          : 'request';

  return {
    modelId: safeModelId,
    capability: typeof input.capability === 'string' ? input.capability : undefined,
    provider: typeof input.provider === 'string' ? input.provider : undefined,
    runtime: typeof input.runtime === 'string' ? input.runtime : undefined,
    source,
  };
}
