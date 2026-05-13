import type { ImageAttachment } from "@apptypes/attachments";
import type { AillameRouteDecision } from "@core/aillame-router/types";
import type { NanoGenerationConfig } from "./nano-generation-config";

export type NanoTaskKind =
  | "conversation"
  | "analysis"
  | "planning"
  | "coding"
  | "math"
  | "research"
  | "education"
  | "creative"
  | "image"
  | "game_design"
  | "game_scene"
  | "game_asset"
  | "game_script"
  | "game_error_fix"
  | "engine_query"
  | "unknown";

export type NanoDifficulty = "low" | "medium" | "high";

export type NanoRiskLevel = "low" | "medium" | "high";

export type NanoLanguage = "tr" | "en" | "mixed";

export type NanoUserInput = {
  prompt: string;
  images?: ImageAttachment[];
  profile?: NanoProfileType;
  maxTokens?: number;
  temperature?: number;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
  sessionSummary?: string;
};

export type NanoTaskAnalysis = {
  kind: NanoTaskKind;
  difficulty: NanoDifficulty;
  language: NanoLanguage;
  riskLevel: NanoRiskLevel;
  needsClarification: boolean;
  needsCurrentInformation: boolean;
  requiresStepByStepReasoning: boolean;
  keywords: string[];
};

export type NanoKnowledgeHit = {
  id: string;
  title: string;
  domain: string;
  content: string;
  score: number;
};

export type NanoGenerationSettings = NanoGenerationConfig;

export type NanoControlPlan = {
  route: AillameRouteDecision;
  analysis: NanoTaskAnalysis;
  knowledge: NanoKnowledgeHit[];
  systemPrompt: string;
  modelPrompt: string;
  settings: NanoGenerationSettings;
  profile?: NanoProfileType;
  memoryContext?: string[];
  capabilityHooks?: NanoLongTermCapabilityHooks;
};

export type NanoLongTermCapabilityHooks = {
  planningReady: boolean;
  toolUseReady: boolean;
  memoryUseReady: boolean;
  codeUseReady: boolean;
  multimodalReady: boolean;
  selfImproveReady: boolean;
  autonomousActionsEnabled: false;
  diagnosticsOnly: true;
};

export type NanoLongTermCapabilityHookNormalization = {
  hooks: NanoLongTermCapabilityHooks;
  warnings: string[];
  diagnostics: {
    autonomousActionsForcedDisabled: boolean;
    advisoryOnly: true;
  };
};

export type NanoProjectRuntimeDecisionMetadata = {
  projectId: string;
  mode?: string;
  intent: NanoTaskKind | string;
  taskType: string;
  taskScore: number;
  riskLevel: NanoRiskLevel;
  needsMemory: boolean;
  memoryScope: "none" | "global" | "project" | "session";
  needsRuntime: boolean;
  requiredCapabilities: string[];
  fallbackRecommended: boolean;
  confidence: number;
  diagnostics: {
    advisoryOnly: true;
    reason?: string;
    warnings?: string[];
  };
  longTermCapabilityHooks: NanoLongTermCapabilityHooks;
};

export type NanoAnswer = {
  content: string;
  plan: NanoControlPlan;
  usedLocalEngine: boolean;
  warnings: string[];
  rawContent?: string;
  engineDebug?: {
    nativeEngineAvailable: boolean;
    checkpointLoaded: boolean;
    checkpointPath?: string;
    generatedTokenCount: number;
    decodedLength: number;
    usefulOutput: boolean;
    cleanupReason?: string;
    removedPromptEcho?: boolean;
    reason?: string;
  };
};

export type NanoProfileType = 'fast' | 'balanced' | 'quality';

export interface NanoProfile {
  id: NanoProfileType;
  label: string;
  description: string;
  maxTokens: number;
  temperature: number;
  topP: number;
}
