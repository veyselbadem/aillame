export type DistillationPreviewStatus = 'draft' | 'approved_for_memory' | 'rejected' | 'archived';
export type DistillationPreviewRiskLevel = 'low' | 'medium' | 'high';

export type DistillationPreview = {
  id: string;
  sourceCandidateId: string;
  sourceFeedbackId: string;
  candidateType: 'positive_learning_candidate' | 'improvement_candidate';
  primaryMode?: string;
  selectedModes?: string[];
  intent?: string;
  proposedMemoryScope: string;
  proposedTitle: string;
  proposedSummary: string;
  proposedKeywords: string[];
  confidenceScore: number;
  riskLevel: DistillationPreviewRiskLevel;
  status: DistillationPreviewStatus;
  createdAt: number;
  updatedAt: number;
};

export type CreateDistillationPreviewInput = {
  sourceCandidateId: string;
  sourceFeedbackId: string;
  candidateType: DistillationPreview['candidateType'];
  primaryMode?: string;
  selectedModes?: string[];
  intent?: string;
  optionalComment?: string;
  safetyFlags?: Record<string, boolean>;
  proposedMemoryScope: string;
  proposedTitle: string;
  proposedSummary: string;
  proposedKeywords: string[];
  confidenceScore: number;
  riskLevel: DistillationPreviewRiskLevel;
  status?: DistillationPreviewStatus;
};

export type UpdateDistillationPreviewStatusInput = {
  id: string;
  status: DistillationPreviewStatus;
};
