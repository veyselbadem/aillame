export type MemoryWriteQueueStatus = 'pending_write' | 'ready_for_memory_write' | 'written' | 'rejected' | 'archived';

export type MemoryWriteQueueRecord = {
  id: string;
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
  status: MemoryWriteQueueStatus;
  createdAt: number;
  updatedAt: number;
};

export type CreateMemoryWriteQueueInput = {
  sourcePreviewId: string;
  sourceCandidateId: string;
  sourceFeedbackId: string;
  targetMemoryScope: string;
  targetMode: string;
  title: string;
  summary: string;
  keywords: string[];
  riskLevel: MemoryWriteQueueRecord['riskLevel'];
  confidenceScore: number;
  status?: MemoryWriteQueueStatus;
};

export type MemoryWriteQueueStore = {
  upsertQueueRecord(input: CreateMemoryWriteQueueInput): Promise<MemoryWriteQueueRecord>;
  listQueueRecords(): Promise<MemoryWriteQueueRecord[]>;
  updateQueueRecordStatus(id: string, status: MemoryWriteQueueStatus): Promise<MemoryWriteQueueRecord | undefined>;
};