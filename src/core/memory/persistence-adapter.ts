export interface PersistenceStatus {
  isAvailable: boolean;
  storeType: "in-memory" | "file" | "sqlite" | "custom";
  isReadOnly: boolean;
}

export interface PersistenceDiagnostics {
  status: PersistenceStatus;
  memoryCardCount: number;
  vectorStoreItemCount: number;
  lastBackupAt?: number;
}

export interface PersistentMemoryAdapter<T> {
  save(projectId: string, id: string, data: T): Promise<void>;
  get(projectId: string, id: string): Promise<T | null>;
  list(projectId: string): Promise<T[]>;
  delete(projectId: string, id: string): Promise<boolean>;
  getDiagnostics(): Promise<PersistenceDiagnostics>;
}

export interface PersistentVectorStoreAdapter<T> {
  upsert(projectId: string, id: string, vector: number[], metadata: T): Promise<void>;
  search(projectId: string, queryVector: number[], topK: number): Promise<Array<{id: string, score: number, metadata: T}>>;
  delete(projectId: string, id: string): Promise<boolean>;
  getDiagnostics(): Promise<PersistenceDiagnostics>;
}
