import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { resolveProjectRelative } from '@/core/project-root';
import type { MemoryCard, CreateMemoryCardInput } from './types';

const MEMORY_CARDS_STORE_PATH = resolveProjectRelative('.aillame-data/stores/memory-cards-store.json');

async function readMemoryCardsFile(): Promise<MemoryCard[]> {
  try {
    const raw = await readFile(MEMORY_CARDS_STORE_PATH, 'utf-8');
    const normalizedRaw = raw.replace(/^\uFEFF/, '');
    return JSON.parse(normalizedRaw) as MemoryCard[];
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeMemoryCardsFile(records: MemoryCard[]): Promise<void> {
  await writeFile(MEMORY_CARDS_STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const jsonMemoryCardStore = {
  async upsertMemoryCard(input: CreateMemoryCardInput): Promise<MemoryCard> {
    const cards = await readMemoryCardsFile();
    const now = Date.now();
    const existingIndex = cards.findIndex((item) => item.sourceQueueId === input.sourceQueueId);

    const card: MemoryCard = {
      id: existingIndex >= 0 ? cards[existingIndex].id : generateId(),
      sourceQueueId: input.sourceQueueId,
      sourcePreviewId: input.sourcePreviewId,
      sourceCandidateId: input.sourceCandidateId,
      sourceFeedbackId: input.sourceFeedbackId,
      memoryScope: input.memoryScope,
      mode: input.mode,
      projectId: input.projectId,
      title: input.title,
      summary: input.summary,
      keywords: input.keywords,
      riskLevel: input.riskLevel,
      confidenceScore: input.confidenceScore,
      status: input.status ?? 'active',
      createdAt: existingIndex >= 0 ? cards[existingIndex].createdAt : now,
      updatedAt: now,
      archivedAt: existingIndex >= 0 ? cards[existingIndex].archivedAt : undefined,
    };

    if (input.status === 'archived') {
      card.archivedAt = now;
    }

    if (existingIndex >= 0) {
      cards[existingIndex] = card;
    } else {
      cards.push(card);
    }

    await writeMemoryCardsFile(cards);
    return card;
  },

  async listMemoryCards(): Promise<MemoryCard[]> {
    return readMemoryCardsFile();
  },

  async archiveMemoryCard(id: string): Promise<MemoryCard | undefined> {
    const cards = await readMemoryCardsFile();
    const index = cards.findIndex((item) => item.id === id);
    if (index < 0) return undefined;
    cards[index] = {
      ...cards[index],
      status: 'archived',
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await writeMemoryCardsFile(cards);
    return cards[index];
  },

  async updateMemoryCardStatus(id: string, status: MemoryCard['status']): Promise<MemoryCard | undefined> {
    const cards = await readMemoryCardsFile();
    const index = cards.findIndex((item) => item.id === id);
    if (index < 0) return undefined;

    cards[index] = {
      ...cards[index],
      status,
      updatedAt: Date.now(),
      archivedAt: status === 'archived' ? Date.now() : undefined,
    };
    await writeMemoryCardsFile(cards);
    return cards[index];
  },
};