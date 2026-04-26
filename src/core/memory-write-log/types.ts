export type MemoryWriteLogAction = 'marked_ready' | 'written' | 'rejected' | 'archived' | 'error';

export type MemoryWriteLogRecord = {
  id: string;
  queueId: string;
  memoryCardId?: string;
  action: MemoryWriteLogAction;
  result: string;
  error?: string;
  createdAt: number;
};

export type CreateMemoryWriteLogInput = Omit<MemoryWriteLogRecord, 'id' | 'createdAt'>;

export type MemoryWriteLogStore = {
  createMemoryWriteLog(input: CreateMemoryWriteLogInput): Promise<MemoryWriteLogRecord>;
  listMemoryWriteLogs(): Promise<MemoryWriteLogRecord[]>;
};