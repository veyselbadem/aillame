import { jsonMemoryWriteQueueStore } from './store-json';
import type { MemoryWriteQueueRecord, MemoryWriteQueueStatus } from './types';
import type { CreateMemoryWriteQueueInput } from './types';
import { listDistillationPreviews } from '@core/distillation-preview/service';
import type { FeedbackRecord } from '@core/feedback/types';

export async function listMemoryWriteQueueRecords(): Promise<MemoryWriteQueueRecord[]> {
  return jsonMemoryWriteQueueStore.listQueueRecords();
}

function buildFeedbackQueueTitle(proposedMemory: string): string {
  const normalized = proposedMemory.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 80) {
    return normalized;
  }

  return `${normalized.slice(0, 77).trimEnd()}...`;
}

export async function findFeedbackMemoryWriteQueueRecordByFeedbackId(
  sourceFeedbackId: string
): Promise<MemoryWriteQueueRecord | undefined> {
  const records = await listMemoryWriteQueueRecords();
  return records.find((record) => record.sourceType === 'feedback' && record.sourceFeedbackId === sourceFeedbackId);
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
    sourceType: 'distillation_preview',
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

export async function queueMemoryWriteRecordFromFeedback(input: {
  feedback: FeedbackRecord;
  proposedMemory: string;
  reason?: string;
  includeSensitive?: boolean;
}): Promise<MemoryWriteQueueRecord> {
  const proposedMemory = input.proposedMemory.trim();
  if (!proposedMemory) {
    throw new Error('proposedMemory gereklidir.');
  }

  if (input.feedback.sensitive && input.includeSensitive !== true) {
    throw new Error('Hassas feedback includeSensitive=true olmadan memory queue\u2019ya eklenemez.');
  }

  const existing = await findFeedbackMemoryWriteQueueRecordByFeedbackId(input.feedback.id);
  if (existing) {
    throw new Error('Bu feedback için memory queue kaydı zaten var.');
  }

  const queueInput: CreateMemoryWriteQueueInput = {
    sourceType: 'feedback',
    sourceFeedbackId: input.feedback.id,
    targetMemoryScope: 'session',
    targetMode: input.feedback.mode || 'general',
    title: buildFeedbackQueueTitle(proposedMemory),
    summary: proposedMemory,
    keywords: input.feedback.tags ?? [],
    riskLevel: 'medium',
    confidenceScore: 0.75,
    status: 'pending_write',
    proposedMemory,
    bridgeReason: input.reason?.trim() || undefined,
    sourceMetadata: {
      source: 'feedback',
      projectId: input.feedback.projectId || null,
      mode: input.feedback.mode || null,
      task: input.feedback.task || null,
      responseId: input.feedback.responseId || null,
      rating: input.feedback.rating || null,
      feedbackText: input.feedback.feedbackText || input.feedback.optionalComment || null,
      reason: input.reason?.trim() || null,
    },
  };

  return jsonMemoryWriteQueueStore.upsertQueueRecord(queueInput);
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
