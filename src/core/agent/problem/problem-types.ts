export type AillameProblemInput = {
  projectId?: string;
  projectType?: string;
  rootPath?: string;
  userMessage?: string;
  logText?: string;
  command?: string;
  contextFiles?: string[];
  metadata?: Record<string, unknown>;
};

export type AillameProblemCategory =
  | "typescript"
  | "build"
  | "runtime"
  | "dependency"
  | "module-resolution"
  | "environment"
  | "database"
  | "prisma"
  | "react"
  | "nextjs"
  | "vite"
  | "electron"
  | "tauri"
  | "rust"
  | "expo"
  | "network"
  | "port-conflict"
  | "permission"
  | "encoding"
  | "unknown";

export type AillameProblemSeverity =
  | "info"
  | "warning"
  | "error"
  | "critical";

export type AillameProblemSignal = {
  category: AillameProblemCategory;
  severity: AillameProblemSeverity;
  pattern: string;
  message: string;
  confidence: number;
};

export type AillameProblemAnalysisResult = {
  success: boolean;
  category: AillameProblemCategory;
  severity: AillameProblemSeverity;
  summary: string;
  likelyCauses: string[];
  evidence: AillameProblemSignal[];
  recommendedChecks: string[];
  suggestedFixPlan: string[];
  safetyNotes: string[];
  readOnly: true;
  confidence: number;
};
