export type AgentPlanRequest = {
  workspacePath: string;
  userTask: string;
  maxDepth?: number;
  maxFiles?: number;
};

export type WorkspaceAgentContext = {
  safeRootName: string;
  projectType: string;
  detectedFrameworks: string[];
  detectedLanguages: string[];
  packageManagers: string[];
  importantFiles: string[];
  relevantDirectories: string[];
  fileStats: {
    totalFiles: number;
    totalDirectories: number;
    byExtension: Record<string, number>;
  };
  safetySummary: {
    secretsExcluded: boolean;
    heavyFilesExcluded: boolean;
    generatedAssetsExcluded: boolean;
    absolutePathsMasked: boolean;
  };
  compactTree: Array<{
    path: string;
    type: "file" | "directory";
    reason?: string;
  }>;
  warnings: string[];
};

export type TaskIntent = {
  category: "bugfix" | "feature" | "refactor" | "test" | "docs" | "ui" | "runtime" | "security" | "unknown";
  confidence: number;
  keywords: string[];
  likelyAreas: string[];
  riskLevel: "low" | "medium" | "high";
};

export type AgentPlan = {
  success: true;
  mode: "read-only-plan";
  task: {
    original: string;
    sanitized: string;
    intent: TaskIntent;
  };
  workspace: WorkspaceAgentContext;
  plan: {
    summary: string;
    steps: Array<{
      order: number;
      title: string;
      description: string;
      type: "inspect" | "analyze" | "test-suggestion" | "risk-check" | "report";
      targetPaths?: string[];
      commandSuggestions?: string[];
      requiresApproval: boolean;
    }>;
  };
  safety: {
    readOnly: true;
    willModifyFiles: false;
    willRunCommands: false;
    requiresHumanApprovalBeforeChanges: true;
    excludedSensitiveFiles: string[];
    warnings: string[];
  };
  nextRecommendedPhase: string;
};
