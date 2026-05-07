export type AillameLearningOutcome =
  | "success"
  | "failed"
  | "partial"
  | "unknown";

export type AillameLearningMemoryStoreMode = "memory" | "json-file";

export type AillameLearningMemorySource =
  | "workspace-analysis"
  | "problem-analysis"
  | "patch-plan"
  | "command-plan"
  | "file-edit-plan"
  | "manual-note"
  | "api-task";

export type AillameLearningMemoryEntry = {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  source: AillameLearningMemorySource;
  category: string;
  title: string;
  summary: string;
  problemSignature?: string;
  errorPatterns: string[];
  likelyCauses: string[];
  recommendedFixes: string[];
  relatedFiles: string[];
  commandsToTry: string[];
  commandsToAvoid: string[];
  safetyNotes: string[];
  outcome: AillameLearningOutcome;
  confidence: number;
  tags: string[];
  metadata?: Record<string, unknown>;
};

export type AillameLearningMemoryCreateInput = {
  projectId?: string;
  source: AillameLearningMemorySource;
  category?: string;
  title: string;
  summary: string;
  problemSignature?: string;
  errorPatterns?: string[];
  likelyCauses?: string[];
  recommendedFixes?: string[];
  relatedFiles?: string[];
  commandsToTry?: string[];
  commandsToAvoid?: string[];
  safetyNotes?: string[];
  outcome?: AillameLearningOutcome;
  confidence?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type AillameLearningMemorySearchInput = {
  projectId?: string;
  query?: string;
  category?: string;
  tags?: string[];
  limit?: number;
};

export type AillameLearningMemorySearchResult = {
  success: boolean;
  matches: AillameLearningMemoryEntry[];
  total: number;
};
