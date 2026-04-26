import { listMemoryCards } from '@core/memory-cards/service';
import { listDistillationPreviews } from '@core/distillation-preview/service';
import type { NanoTrainingRecord, NanoTrainingExportResult } from './types';

const BAD_PHRASES = [
  'İşlem durduruldu',
  'bir hata oluştu',
  'error',
  'hazır değil',
];

function isSafeOutput(output: string): boolean {
  if (!output || output.trim().length < 5) return false;
  
  const lowerOutput = output.toLowerCase();
  for (const phrase of BAD_PHRASES) {
    if (lowerOutput.includes(phrase.toLowerCase())) {
      return false;
    }
  }
  
  return true;
}

import { validateNanoTrainingRecord } from './validator';

export async function exportApprovedTrainingData(): Promise<NanoTrainingExportResult> {
  const allCards = await listMemoryCards();
  const allPreviews = await listDistillationPreviews();
  
  const records: NanoTrainingRecord[] = [];
  const processedIds = new Set<string>();

  // 1. Memory Cards (En güvenli kaynak - onaylanmış ve kuyruktan geçmiş)
  for (const card of allCards) {
    if (card.status !== 'active') continue;
    
    const record: NanoTrainingRecord = {
      id: `tr_${card.id}`,
      instruction: card.title,
      input: card.keywords?.join(', '),
      output: card.summary,
      source: 'memory_card',
      sourceId: card.id,
      riskLevel: card.riskLevel as any,
      approved: true,
      createdAt: card.createdAt,
    };

    const validation = validateNanoTrainingRecord(record);
    if (!validation.valid) {
      console.warn(`[Training Export] MemoryCard ${card.id} blocked:`, validation.blockedReasons);
      continue;
    }

    records.push(record);
    processedIds.add(card.sourcePreviewId);
  }

  // 2. Distillation Previews (Henüz card olmamış ama onaylanmışlar)
  for (const preview of allPreviews) {
    if (processedIds.has(preview.id)) continue; 
    if (preview.status !== 'approved_for_memory') continue;

    const record: NanoTrainingRecord = {
      id: `tr_prev_${preview.id}`,
      instruction: preview.proposedTitle,
      input: preview.proposedKeywords?.join(', '),
      output: preview.proposedSummary,
      source: 'distillation_preview',
      sourceId: preview.id,
      riskLevel: preview.riskLevel as any,
      approved: true,
      createdAt: preview.createdAt,
    };

    const validation = validateNanoTrainingRecord(record);
    if (!validation.valid) {
      console.warn(`[Training Export] Preview ${preview.id} blocked:`, validation.blockedReasons);
      continue;
    }

    records.push(record);
  }

  return {
    success: true,
    count: records.length,
    data: records,
    timestamp: Date.now(),
  };
}
