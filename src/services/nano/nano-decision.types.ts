export type AillameProject = "bademakademi" | "boss" | "doomsgame" | "generic" | "unknown";
export type ClassifierLayer = "bootstrap" | "llm" | "fallback";
export type PermissionMode = "read_only" | "suggest_edits" | "user_approved_write" | "sandbox_full_agent";

export interface NanoDecision {
  project: AillameProject;
  task: string;
  workflow: string;
  modelNeeds: string[];
  permissionMode: PermissionMode;
  confidence: number;
  classifierLayer: ClassifierLayer;
  fallbackWorkflow: string;
  reasoningSummary?: string;
  warnings?: string[];
  inputSummary?: string;
  createdAt: string;
}

export interface NanoDecisionResult {
  ok: boolean;
  decision: NanoDecision;
  diagnostics: {
    bootstrapUsed: boolean;
    llmUsed: boolean;
    fallbackUsed: boolean;
    schemaValidated: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}
