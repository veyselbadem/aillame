export type PatchProposalRequest = {
  workspacePath: string;
  userTask: string;
  relativePaths?: string[];
  maxFiles?: number;
  maxBytesPerFile?: number;
  mode?: "proposal-only";
};

export type PatchTarget = {
  relativePath: string;
  language: string;
  reason: string;
  riskLevel: "low" | "medium" | "high";
};

export type PatchChange = {
  relativePath: string;
  changeType: "replace-block" | "insert-after" | "insert-before" | "delete-block" | "create-file-proposal";
  title: string;
  rationale: string;
  beforeSnippet?: string;
  afterSnippet?: string;
  unifiedDiff?: string;
  safetyNotes: string[];
};

export type PatchProposal = {
  success: true;
  mode: "proposal-only";
  readOnly: true;
  willModifyFiles: false;
  willRunCommands: false;
  requiresHumanApproval: true;
  task: {
    original: string;
    sanitized: string;
    category: string;
    intent: {
      category: string;
      confidence: number;
      riskLevel: "low" | "medium" | "high";
    };
  };
  workspace: {
    safeRootName: string;
    projectType: string;
    detectedFrameworks: string[];
    detectedLanguages: string[];
  };
  targets: PatchTarget[];
  changes: PatchChange[];
  testSuggestions: string[];
  riskSummary: {
    overallRisk: "low" | "medium" | "high";
    reasons: string[];
  };
  safety: {
    blockedSensitiveFiles: string[];
    skippedFiles: Array<{
      relativePath: string;
      reason: string;
    }>;
    warnings: string[];
    secretsRedacted: boolean;
    absolutePathsMasked: boolean;
  };
  nextSteps: string[];
};
