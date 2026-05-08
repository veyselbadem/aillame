export type LearningCardOutcome = "success" | "partial" | "failed";

export interface LearningCard {
  id: string;
  createdAt: number;
  projectId: string;
  safeRootName: string;
  taskCategory: string;
  taskSummary: string;
  outcome: LearningCardOutcome;
  changedAreas: string[];
  appliedChangeTypes: string[];
  verificationSuggestions: string[];
  riskLevel: "low" | "medium" | "high";
  lessons: string[];
  safetyNotes: string[];
  source: "execution-audit" | "manual-summary";
}

export interface MemorySummary {
  totalCards: number;
  byCategory: Record<string, number>;
  topLessons: string[];
  recentInsights: string[];
  safetyWarnings: string[];
  lastUpdated: number;
}
