export type MemoryWriteQueueStatus = 'pending_write' | 'ready_for_memory_write' | 'written' | 'rejected' | 'archived';

export type MemoryWriteQueueSourceType = 'distillation_preview' | 'feedback';

export type MemoryWriteQueueSourceMetadataValue = string | number | boolean | null;

export type MemoryWriteQueueSourceMetadata = Record<string, MemoryWriteQueueSourceMetadataValue>;

export type MemoryWriteQueueRecord = {
  id: string;
  sourceType: MemoryWriteQueueSourceType;
  sourcePreviewId: string;
  sourceCandidateId: string;
  sourceFeedbackId: string;
  targetMemoryScope: string;
  targetMode: string;
  title: string;
  summary: string;
  keywords: string[];
  riskLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
  proposedMemory?: string;
  bridgeReason?: string;
  sourceMetadata?: MemoryWriteQueueSourceMetadata;
  status: MemoryWriteQueueStatus;
  createdAt: number;
  updatedAt: number;
};

export type CreateMemoryWriteQueueInput = {
  sourceType: MemoryWriteQueueSourceType;
  sourcePreviewId?: string;
  sourceCandidateId?: string;
  sourceFeedbackId: string;
  targetMemoryScope: string;
  targetMode: string;
  title: string;
  summary: string;
  keywords: string[];
  riskLevel: MemoryWriteQueueRecord['riskLevel'];
  confidenceScore: number;
  proposedMemory?: string;
  bridgeReason?: string;
  sourceMetadata?: MemoryWriteQueueSourceMetadata;
  status?: MemoryWriteQueueStatus;
};

export type MemoryWriteQueueStore = {
  upsertQueueRecord(input: CreateMemoryWriteQueueInput): Promise<MemoryWriteQueueRecord>;
  listQueueRecords(): Promise<MemoryWriteQueueRecord[]>;
  updateQueueRecordStatus(id: string, status: MemoryWriteQueueStatus): Promise<MemoryWriteQueueRecord | undefined>;
};