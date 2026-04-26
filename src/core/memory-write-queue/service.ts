import { jsonMemoryWriteQueueStore } from './store-json';
import type { MemoryWriteQueueRecord, MemoryWriteQueueStatus } from './types';
import type { CreateMemoryWriteQueueInput } from './types';
import { listDistillationPreviews } from '@core/distillation-preview/service';

export async function listMemoryWriteQueueRecords(): Promise<MemoryWriteQueueRecord[]> {
  return jsonMemoryWriteQueueStore.listQueueRecords();
}

export async function queueMemoryWriteRecordForPreview(previewId: string): Promise<MemoryWriteQueueRecord> {
  const previews = await listDistillationPreviews();
  const preview = previews.find((item) => item.id === previewId);
  if (!preview) {
    throw new Error('Distillation preview bulunamadı.');
  }

  if (preview.status !== 'approved_for_memory') {
    throw new Error('Sadece approved_for_memory durumundaki preview kuyruğa alınabilir.');
  }

  const input: CreateMemoryWriteQueueInput = {
    sourcePreviewId: preview.id,
    sourceCandidateId: preview.sourceCandidateId,
    sourceFeedbackId: preview.sourceFeedbackId,
    targetMemoryScope: preview.proposedMemoryScope,
    targetMode: preview.primaryMode ?? '',
    title: preview.proposedTitle,
    summary: preview.proposedSummary,
    keywords: preview.proposedKeywords,
    riskLevel: preview.riskLevel,
    confidenceScore: preview.confidenceScore,
  };

  return jsonMemoryWriteQueueStore.upsertQueueRecord(input);
}

export async function updateMemoryWriteQueueRecordStatus(
  id: string,
  status: MemoryWriteQueueStatus
): Promise<MemoryWriteQueueRecord | undefined> {
  return jsonMemoryWriteQueueStore.updateQueueRecordStatus(id, status);
}

export async function getMemoryWriteQueueRecordById(id: string): Promise<MemoryWriteQueueRecord | undefined> {
  return jsonMemoryWriteQueueStore.getQueueRecordById(id);
}
