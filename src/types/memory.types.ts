export interface AillameMemoryFact {
  id: string;
  text: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface AillameMemoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: string;
  taskType?: string;
  createdAt: string;
}

export interface AillameProjectMemory {
  projectId: string;
  facts: AillameMemoryFact[];
  recentMessages: AillameMemoryMessage[];
  updatedAt: string;
}

export interface AillameMemoryContext {
  projectId: string;
  facts: AillameMemoryFact[];
  recentMessages: AillameMemoryMessage[];
  meta: {
    factCount: number;
    recentMessageCount: number;
    loadedAt: string;
  };
}
