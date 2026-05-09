
export type NanoTaskType = 
  | 'social_chat'
  | 'general_knowledge'
  | 'current_research'
  | 'code_help'
  | 'agent_task'
  | 'image_generation'
  | 'image_analysis'
  | 'list_examples'
  | 'compare'
  | 'explain_more'
  | 'continue_context'
  | 'tool_error'
  | 'ai_lab_reflection'
  | 'learning_candidate'
  | 'unknown';

export type NanoToolTarget = 
  | 'QuickResponse'
  | 'GeneralKnowledge'
  | 'Qwen'
  | 'CodeAgent'
  | 'Web Search'
  | 'SDXL'
  | 'Gemma'
  | 'Ollama'
  | 'safeFallback';

export type NanoRouteTarget = 'text' | 'igm' | 'code' | 'agent' | 'clarification';

export interface NanoIntentMetadata {
  intent: string;
  confidence: number;
  normalizedText: string;
  matchedSignals: string[];
  fallbackReason?: string;
  routeTarget: NanoRouteTarget;
}

export interface NanoCognitivePlan {
  taskType: NanoTaskType;
  toolTarget: NanoToolTarget;
  confidenceScore: number;
  reason: string;
  intentMeta?: NanoIntentMetadata;
  taskScore?: {
    complexity: number;
    research: number;
    code: number;
    creative: number;
  };
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
  source: 'ai_lab' | 'chat' | 'qwen' | 'web_search' | 'gemma' | 'ollama' | 'web_search+gemma' | 'web_search+ollama';
}

export interface NanoReflection {
  summary: string;
  suggestion?: string;
  learningCandidate?: NanoLearningSuggestion;
  nextStep?: string;
}
