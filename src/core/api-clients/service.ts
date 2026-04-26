import crypto from 'crypto';
import type {
  ApiClient,
  ApiClientMemoryPolicy,
  ApiClientRateLimitProfile,
  ApiClientStatus,
  CreateApiClientInput,
  CreateApiClientResult,
  UpdateApiClientInput,
  VerifyApiClientResult,
} from './types';
import { jsonApiClientsStore } from './store-json';

const DEFAULT_RATE_LIMIT_PROFILE: ApiClientRateLimitProfile = 'standard';

function getDefaultMemoryPolicy(ownerType: ApiClient['ownerType']): ApiClientMemoryPolicy {
  const safeBase: ApiClientMemoryPolicy = {
    allowGlobalRead: false,
    allowGlobalWrite: false,
    allowProjectMemory: true,
    allowClientMemory: true,
    allowSessionMemory: true,
    allowTaskMemory: true,
    allowMemoryWriteQueueOnly: true,
  };

  if (ownerType === 'personal') {
    return { ...safeBase, allowGlobalRead: true };
  }

  return safeBase;
}

function normalizeMemoryPolicy(policy: Partial<ApiClientMemoryPolicy> | undefined, ownerType: ApiClient['ownerType']): ApiClientMemoryPolicy {
  return {
    ...getDefaultMemoryPolicy(ownerType),
    ...(policy ?? {}),
  };
}

function createClientId(displayName: string): string {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${slug || 'client'}-${crypto.randomBytes(3).toString('hex')}`;
}

function createApiKeyPrefix(): string {
  return crypto.randomBytes(4).toString('hex');
}

function createRawApiKey(prefix: string): string {
  const keyBody = crypto.randomBytes(24).toString('hex');
  return `ail_${prefix}_${keyBody}`;
}

function getApiKeyHash(rawApiKey: string): string {
  const secret = process.env.AILLAME_API_KEY_HASH_SECRET ?? '';
  return crypto.createHmac('sha256', secret).update(rawApiKey).digest('hex');
}

function now(): number {
  return Date.now();
}

export async function listApiClients(): Promise<ApiClient[]> {
  return jsonApiClientsStore.listApiClients();
}

export async function getApiClientById(id: string): Promise<ApiClient | undefined> {
  return jsonApiClientsStore.getApiClientById(id);
}

export async function getApiClientByClientId(clientId: string): Promise<ApiClient | undefined> {
  return jsonApiClientsStore.getApiClientByClientId(clientId);
}

export async function createApiClient(input: CreateApiClientInput): Promise<CreateApiClientResult> {
  const apiKeyPrefix = createApiKeyPrefix();
  const rawApiKey = createRawApiKey(apiKeyPrefix);
  const client: ApiClient = {
    id: `ac_${crypto.randomBytes(8).toString('hex')}`,
    clientId: createClientId(input.displayName),
    projectId: input.projectId,
    displayName: input.displayName,
    description: input.description,
    ownerType: input.ownerType,
    apiKeyHash: getApiKeyHash(rawApiKey),
    apiKeyPrefix,
    allowedModes: input.allowedModes,
    allowedTasks: input.allowedTasks || [],
    allowedTools: input.allowedTools || [],
    rateLimitProfile: input.rateLimitProfile ?? DEFAULT_RATE_LIMIT_PROFILE,
    memoryPolicy: normalizeMemoryPolicy(input.memoryPolicy, input.ownerType),
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
    notes: input.notes,
  };
  await jsonApiClientsStore.upsertApiClient(client);
  return { client, rawApiKey };
}

export async function verifyApiClientKey(rawApiKey: string): Promise<VerifyApiClientResult> {
  if (!rawApiKey.startsWith('ail_')) {
    return { success: false, error: 'invalid_api_key_format', statusCode: 401 };
  }

  const prefix = rawApiKey.split('_')[1] ?? '';
  if (!prefix) {
    return { success: false, error: 'invalid_api_key_prefix', statusCode: 401 };
  }

  const client = await jsonApiClientsStore.findApiClientByKeyPrefix(prefix);
  if (!client) {
    return { success: false, error: 'api_key_not_found', statusCode: 401 };
  }

  if (client.status !== 'active') {
    return { success: false, error: `client_${client.status}`, statusCode: 403 };
  }

  const hash = getApiKeyHash(rawApiKey);
  if (hash !== client.apiKeyHash) {
    return { success: false, error: 'invalid_api_key', statusCode: 401 };
  }

  const updatedClient = await jsonApiClientsStore.updateApiClientLastUsed(client.id);
  return { success: true, client: updatedClient ?? client };
}

export async function updateApiClient(id: string, updates: UpdateApiClientInput): Promise<ApiClient | undefined> {
  const existingClient = await jsonApiClientsStore.getApiClientById(id);
  if (!existingClient) {
    return undefined;
  }

  const sanitizedUpdates = {
    ...updates,
  } as Partial<ApiClient>;

  if (updates.memoryPolicy) {
    sanitizedUpdates.memoryPolicy = normalizeMemoryPolicy(updates.memoryPolicy, existingClient.ownerType);
  }

  if (updates.status === 'revoked' && existingClient.status !== 'revoked') {
    sanitizedUpdates.revokedAt = now();
  }

  if (updates.status === 'active') {
    sanitizedUpdates.revokedAt = undefined;
  }

  return jsonApiClientsStore.updateApiClient(id, sanitizedUpdates);
}

export async function revokeApiClient(id: string): Promise<ApiClient | undefined> {
  return jsonApiClientsStore.revokeApiClient(id);
}

export function assertClientCanUseProject(client: ApiClient, projectId: string): boolean {
  return client.projectId === projectId;
}

export function assertClientCanUseMode(client: ApiClient, mode: string): boolean {
  return client.allowedModes.includes(mode as typeof client.allowedModes[number]);
}

export function assertClientCanUseTask(client: ApiClient, taskId: string): boolean {
  return client.allowedTasks.length === 0 || client.allowedTasks.includes(taskId);
}

export function assertClientCanUseTool(client: ApiClient, toolId: string): boolean {
  return client.allowedTools.length === 0 || client.allowedTools.includes(toolId);
}
