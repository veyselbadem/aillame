
export type NanoTaskType = 
  | 'social_chat'
  | 'general_knowledge'
  | 'current_research'
  | 'code_help'
  | 'image_generation'
  | 'ai_lab_reflection'
  | 'learning_candidate'
  | 'unknown';

export type NanoToolTarget = 
  | 'QuickResponse'
  | 'GeneralKnowledge'
  | 'Qwen'
  | 'Web Search'
  | 'SDXL'
  | 'safeFallback';

export interface NanoCognitivePlan {
  taskType: NanoTaskType;
  toolTarget: NanoToolTarget;
  confidenceScore: number;
  reason: string;
}

export interface NanoLearningSuggestion {
  instruction: string;
  input?: string;
  output: string;
  topic: string;
  mode: string;
  confidenceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
  source: 'ai_lab' | 'chat' | 'qwen' | 'web_search';
}

export interface NanoReflection {
  summary: string;
  suggestion?: string;
  learningCandidate?: NanoLearningSuggestion;
  nextStep?: string;
}
