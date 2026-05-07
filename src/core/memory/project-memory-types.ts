import type { AillameMemoryScopeKind, AillameProjectIdentity } from "@core/projects/project-identity";

export type MemoryScope = "global" | "project" | "session";

export type ProjectMemoryAttribution = {
  projectId: string;
  scope: MemoryScope;
  sessionId?: string;
  sourceApp?: string;
  requestId?: string;
};

export type ProjectMemoryEntry = {
  id: string;
  projectId: string;
  scope: MemoryScope;
  sessionId?: string;
  topic?: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  attribution: ProjectMemoryAttribution;
};

export type ProjectMemoryQuery = {
  identity: AillameProjectIdentity;
  query?: string;
  scope?: MemoryScope;
  includeGlobal?: boolean;
  limit?: number;
};

export type ProjectMemoryWriteRequest = {
  identity: AillameProjectIdentity;
  scope?: Exclude<AillameMemoryScopeKind, "none">;
  topic?: string;
  content: string;
  tags?: string[];
};

export type ProjectMemoryReadResult = {
  success: boolean;
  entries: ProjectMemoryEntry[];
  warnings: string[];
  diagnostics: {
    projectId: string;
    scope: MemoryScope;
    includeGlobal: boolean;
    isolationApplied: boolean;
  };
  attribution: ProjectMemoryAttribution;
};

export type ProjectMemoryWriteResult = {
  success: boolean;
  entry?: ProjectMemoryEntry;
  warnings: string[];
  diagnostics: {
    projectId: string;
    scope?: MemoryScope;
    blocked: boolean;
    reasonCode?: string;
  };
  attribution: ProjectMemoryAttribution;
};
