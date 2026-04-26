import { jsonDistillationPreviewStore } from './store-json';
import type { DistillationPreview, DistillationPreviewStatus, CreateDistillationPreviewInput } from './types';
import type { LearningCandidate } from '@core/learning-candidates/types';

function determineRiskLevel(candidate: LearningCandidate): DistillationPreview['riskLevel'] {
  if (candidate.primaryMode === 'economy' || candidate.safetyFlags?.requiresFinancialDisclaimer) {
    return 'medium';
  }

  return candidate.type === 'positive_learning_candidate' ? 'low' : 'medium';
}

function buildProposedSummary(candidate: LearningCandidate): string {
  const base = candidate.optionalComment ? `${candidate.optionalComment}` : 'Önerilen learning candidate.';
  const details = [`Mode: ${candidate.primaryMode ?? 'bilinmiyor'}`, `Intent: ${candidate.intent ?? 'bilinmiyor'}`];
  let summary = `${base} (${details.join(', ')})`;

  if (candidate.primaryMode === 'economy' || candidate.safetyFlags?.requiresFinancialDisclaimer) {
    summary += ' Finansal içerik olduğundan risk değerlendirmesi yapılmalıdır.';
  }

  return summary;
}

function buildKeywords(candidate: LearningCandidate): string[] {
  const keywords = new Set<string>();
  if (candidate.primaryMode) keywords.add(candidate.primaryMode);
  if (candidate.intent) keywords.add(candidate.intent);
  if (candidate.selectedModes) candidate.selectedModes.forEach((mode) => keywords.add(mode));
  keywords.add(candidate.type === 'positive_learning_candidate' ? 'positive' : 'improvement');
  return Array.from(keywords);
}

function buildProposedMemoryScope(candidate: LearningCandidate): string {
  if (candidate.type === 'improvement_candidate') return 'task';
  if (candidate.primaryMode === 'education') return 'session';
  return 'session';
}

export async function createOrUpdateDistillationPreview(candidate: LearningCandidate): Promise<DistillationPreview> {
  const previewInput: CreateDistillationPreviewInput = {
    sourceCandidateId: candidate.id,
    sourceFeedbackId: candidate.sourceFeedbackId,
    candidateType: candidate.type,
    primaryMode: candidate.primaryMode,
    selectedModes: candidate.selectedModes,
    intent: candidate.intent,
    optionalComment: candidate.optionalComment,
    safetyFlags: candidate.safetyFlags,
    proposedMemoryScope: buildProposedMemoryScope(candidate),
    proposedTitle: candidate.type === 'positive_learning_candidate' ? 'Başarılı cevap örneği' : 'İyileştirme notu',
    proposedSummary: buildProposedSummary(candidate),
    proposedKeywords: buildKeywords(candidate),
    confidenceScore: candidate.type === 'positive_learning_candidate' ? 0.75 : 0.6,
    riskLevel: determineRiskLevel(candidate),
  };

  return jsonDistillationPreviewStore.upsertPreview(previewInput);
}

export async function listDistillationPreviews(): Promise<DistillationPreview[]> {
  return jsonDistillationPreviewStore.listPreviews();
}

export async function updateDistillationPreviewStatus(id: string, status: DistillationPreviewStatus): Promise<DistillationPreview | undefined> {
  return jsonDistillationPreviewStore.updatePreviewStatus(id, status);
}
