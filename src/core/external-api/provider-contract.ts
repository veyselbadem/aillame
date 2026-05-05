export type ExternalProjectMode =
  | 'general'
  | 'education'
  | 'code'
  | 'economy'
  | 'game'
  | 'legal'
  | 'psychology'
  | 'custom';

export type ExternalProviderMetadataValue = string | number | boolean | null;

export interface ExternalProviderContext {
  projectId?: string;
  mode?: string;
  userId?: string;
  sessionId?: string;
  source?: string;
  metadata?: Record<string, ExternalProviderMetadataValue>;
}

export interface ExternalProviderRequestContract {
  model?: unknown;
  messages?: unknown;
  prompt?: unknown;
  context?: unknown;
  temperature?: unknown;
  max_tokens?: unknown;
  stream?: unknown;
  projectId?: unknown;
  mode?: unknown;
  userId?: unknown;
  sessionId?: unknown;
  source?: unknown;
  metadata?: unknown;
}

export interface ExternalProviderNormalizedContext {
  projectId: string;
  mode: ExternalProjectMode;
  source: string;
  sessionId?: string;
  userId?: string;
  metadata: Record<string, ExternalProviderMetadataValue>;
  warnings: string[];
}

const DEFAULT_PROJECT_ID = 'external-client';
const DEFAULT_MODE: ExternalProjectMode = 'general';
const DEFAULT_SOURCE = 'external-api';
const MODE_SET = new Set<ExternalProjectMode>([
  'general',
  'education',
  'code',
  'economy',
  'game',
  'legal',
  'psychology',
  'custom',
]);
const SECRET_KEY_PATTERN = /(api[_-]?key|token|secret|password|passwd|authorization)/i;
const MAX_ID_LENGTH = 64;
const MAX_SOURCE_LENGTH = 40;
const MAX_METADATA_KEYS = 16;
const MAX_METADATA_STRING_LENGTH = 160;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeIdentifier(input: unknown, maxLength = MAX_ID_LENGTH): string | undefined {
  if (typeof input !== 'string') return undefined;
  const sanitized = input
    .trim()
    .replace(/[\\/\x00-\x1f]+/g, '-')
    .replace(/[^a-zA-Z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
  return sanitized || undefined;
}

function sanitizeSource(input: unknown): string | undefined {
  return sanitizeIdentifier(input, MAX_SOURCE_LENGTH)?.toLowerCase();
}

export function normalizeExternalProjectMode(input: unknown): ExternalProjectMode {
  if (typeof input !== 'string') return DEFAULT_MODE;
  const normalized = input.trim().toLowerCase();
  return MODE_SET.has(normalized as ExternalProjectMode)
    ? (normalized as ExternalProjectMode)
    : DEFAULT_MODE;
}

export function sanitizeExternalProjectId(input: unknown): string | undefined {
  return sanitizeIdentifier(input);
}

export function sanitizeExternalSessionId(input: unknown): string | undefined {
  return sanitizeIdentifier(input);
}

export function sanitizeExternalMetadata(input: unknown): Record<string, ExternalProviderMetadataValue> {
  if (!isRecord(input)) return {};

  const entries = Object.entries(input).slice(0, MAX_METADATA_KEYS);
  const result: Record<string, ExternalProviderMetadataValue> = {};

  for (const [rawKey, rawValue] of entries) {
    const key = sanitizeIdentifier(rawKey, 48);
    if (!key) continue;
    if (SECRET_KEY_PATTERN.test(key)) continue;

    if (
      rawValue === null
      || typeof rawValue === 'boolean'
      || typeof rawValue === 'number'
    ) {
      result[key] = rawValue;
      continue;
    }

    if (typeof rawValue === 'string') {
      result[key] = rawValue.slice(0, MAX_METADATA_STRING_LENGTH);
    }
  }

  return result;
}

export function extractExternalProviderContext(payload: unknown): ExternalProviderNormalizedContext {
  const warnings: string[] = [];
  const body = isRecord(payload) ? payload as ExternalProviderRequestContract : {};
  const nestedContext = isRecord(body.context) ? body.context : {};

  const rawProjectId = body.projectId ?? nestedContext.projectId;
  const rawMode = body.mode ?? nestedContext.mode;
  const rawSource = body.source ?? nestedContext.source;
  const rawSessionId = body.sessionId ?? nestedContext.sessionId;
  const rawUserId = body.userId ?? nestedContext.userId;
  const rawMetadata = body.metadata ?? nestedContext.metadata;

  const projectId = sanitizeExternalProjectId(rawProjectId) ?? DEFAULT_PROJECT_ID;
  if (rawProjectId !== undefined && projectId === DEFAULT_PROJECT_ID) {
    warnings.push('projectId sanitized to default.');
  }

  const mode = normalizeExternalProjectMode(rawMode);
  if (typeof rawMode === 'string' && rawMode.trim() && mode !== rawMode.trim().toLowerCase()) {
    warnings.push('mode normalized to default.');
  }

  const source = sanitizeSource(rawSource) ?? DEFAULT_SOURCE;
  if (rawSource !== undefined && source === DEFAULT_SOURCE && rawSource !== DEFAULT_SOURCE) {
    warnings.push('source normalized to default.');
  }

  const sessionId = sanitizeExternalSessionId(rawSessionId);
  const userId = sanitizeExternalSessionId(rawUserId);
  const metadata = sanitizeExternalMetadata(rawMetadata);

  if (isRecord(rawMetadata) && Object.keys(rawMetadata).length > Object.keys(metadata).length) {
    warnings.push('metadata filtered for safety.');
  }

  return {
    projectId,
    mode,
    source,
    sessionId,
    userId,
    metadata,
    warnings,
  };
}

export function summarizeExternalProviderContext(context: ExternalProviderNormalizedContext): string {
  const parts = [
    `project=${context.projectId}`,
    `mode=${context.mode}`,
    `source=${context.source}`,
  ];

  if (context.sessionId) parts.push(`session=${context.sessionId}`);
  if (context.userId) parts.push(`user=${context.userId}`);

  const metadataKeys = Object.keys(context.metadata);
  if (metadataKeys.length > 0) {
    parts.push(`metadata=${metadataKeys.join(',')}`);
  }

  if (context.warnings.length > 0) {
    parts.push(`warnings=${context.warnings.join('|')}`);
  }

  return parts.join(' ');
}
