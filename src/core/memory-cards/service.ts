import { jsonMemoryCardStore } from './store-json';
import type { MemoryCard, CreateMemoryCardInput } from './types';
import type { MemoryWriteQueueRecord } from '@core/memory-write-queue/types';

export async function listMemoryCards(): Promise<MemoryCard[]> {
  return jsonMemoryCardStore.listMemoryCards();
}

export async function createMemoryCardFromQueueRecord(
  queueRecord: MemoryWriteQueueRecord
): Promise<MemoryCard> {
  if (queueRecord.status !== 'ready_for_memory_write') {
    throw new Error('Queue kaydı ready_for_memory_write statüsünde olmalı.');
  }

  if (queueRecord.riskLevel === 'high') {
    throw new Error('Yüksek riskli kayıtlar ekstra inceleme gerektirir.');
  }

  const existingCards = await jsonMemoryCardStore.listMemoryCards();
  const duplicatePreview = existingCards.find(
    (item) => item.sourcePreviewId === queueRecord.sourcePreviewId && item.sourceQueueId !== queueRecord.id
  );

  if (duplicatePreview) {
    throw new Error('Aynı preview kaydı için zaten bir MemoryCard mevcut.');
  }

  const input: CreateMemoryCardInput = {
    sourceQueueId: queueRecord.id,
    sourcePreviewId: queueRecord.sourcePreviewId,
    sourceCandidateId: queueRecord.sourceCandidateId,
    sourceFeedbackId: queueRecord.sourceFeedbackId,
    memoryScope: queueRecord.targetMemoryScope,
    mode: queueRecord.targetMode,
    projectId: 'aillame-local',
    title: queueRecord.title,
    summary: queueRecord.summary,
    keywords: queueRecord.keywords,
    riskLevel: queueRecord.riskLevel,
    confidenceScore: queueRecord.confidenceScore,
    status: 'active',
  };

  return jsonMemoryCardStore.upsertMemoryCard(input);
}

export async function upsertMemoryCard(input: CreateMemoryCardInput): Promise<MemoryCard> {
  return jsonMemoryCardStore.upsertMemoryCard(input);
}

export async function archiveMemoryCard(id: string): Promise<MemoryCard | undefined> {
  return jsonMemoryCardStore.archiveMemoryCard(id);
}

export async function updateMemoryCardStatus(id: string, status: MemoryCard['status']): Promise<MemoryCard | undefined> {
  return jsonMemoryCardStore.updateMemoryCardStatus(id, status);
}
