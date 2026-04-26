export type MemoryCardStatus = 'active' | 'archived';

export type MemoryCard = {
  id: string;
  sourceQueueId: string;
  sourcePreviewId: string;
  sourceCandidateId: string;
  sourceFeedbackId: string;
  memoryScope: string;
  mode: string;
  projectId?: string;
  title: string;
  summary: string;
  keywords: string[];
  riskLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
  status: MemoryCardStatus;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
};

export type CreateMemoryCardInput = Omit<MemoryCard, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'> & {
  status?: MemoryCardStatus;
};

export type MemoryCardStore = {
  upsertMemoryCard(input: CreateMemoryCardInput): Promise<MemoryCard>;
  listMemoryCards(): Promise<MemoryCard[]>;
  archiveMemoryCard(id: string): Promise<MemoryCard | undefined>;
};