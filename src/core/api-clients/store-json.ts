import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { ApiClient } from './types';

const API_CLIENTS_STORE_PATH = path.join(process.cwd(), 'api-clients-store.json');

async function readJsonFile<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const normalized = raw.replace(/^\uFEFF/, '');
    return JSON.parse(normalized) as T[];
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, records: T[]): Promise<void> {
  await writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8');
}

export const jsonApiClientsStore = {
  async readApiClients(): Promise<ApiClient[]> {
    return readJsonFile<ApiClient>(API_CLIENTS_STORE_PATH);
  },

  async writeApiClients(clients: ApiClient[]): Promise<void> {
    await writeJsonFile<ApiClient>(API_CLIENTS_STORE_PATH, clients);
  },

  async upsertApiClient(input: ApiClient): Promise<ApiClient> {
    const clients = await this.readApiClients();
    const existingIndex = clients.findIndex((client) => client.id === input.id);
    if (existingIndex >= 0) {
      clients[existingIndex] = input;
    } else {
      clients.push(input);
    }
    await this.writeApiClients(clients);
    return input;
  },

  async listApiClients(): Promise<ApiClient[]> {
    return this.readApiClients();
  },

  async getApiClientById(id: string): Promise<ApiClient | undefined> {
    const clients = await this.readApiClients();
    return clients.find((client) => client.id === id);
  },

  async getApiClientByClientId(clientId: string): Promise<ApiClient | undefined> {
    const clients = await this.readApiClients();
    return clients.find((client) => client.clientId === clientId);
  },

  async findApiClientByKeyPrefix(prefix: string): Promise<ApiClient | undefined> {
    const clients = await this.readApiClients();
    return clients.find((client) => client.apiKeyPrefix === prefix);
  },

  async updateApiClient(id: string, updates: Partial<ApiClient>): Promise<ApiClient | undefined> {
    const clients = await this.readApiClients();
    const index = clients.findIndex((client) => client.id === id);
    if (index < 0) {
      return undefined;
    }
    const updated: ApiClient = {
      ...clients[index],
      ...updates,
      updatedAt: Date.now(),
    };
    clients[index] = updated;
    await this.writeApiClients(clients);
    return updated;
  },

  async revokeApiClient(id: string): Promise<ApiClient | undefined> {
    return this.updateApiClient(id, { status: 'revoked', revokedAt: Date.now() });
  },

  async updateApiClientLastUsed(id: string): Promise<ApiClient | undefined> {
    return this.updateApiClient(id, { lastUsedAt: Date.now() });
  },
};


