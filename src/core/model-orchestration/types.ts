export type ModelIntent = 
  | 'simple_chat'
  | 'text_generation'
  | 'general_knowledge'
  | 'code_help'
  | 'analysis'
  | 'image_generation'
  | 'agent_task'
  | 'ambiguous'
  | 'web_research'
  | 'news_analysis'
  | 'training_discussion'
  | 'unknown';

export type OrchestrationTarget = 
  | 'nano' 
  | 'qwen' 
  | 'code_agent'
  | 'gemini' 
  | 'sdxl' 
  | 'web_search' 
  | 'ai_lab';

export type RouteTarget = 'text' | 'igm' | 'code' | 'agent' | 'clarification';

export interface IntentRoutingMetadata {
  intent: string;
  confidence: number;
  normalizedText: string;
  matchedSignals: string[];
  fallbackReason?: string;
  routeTarget: RouteTarget;
}

export type ExecutionMode = 'active' | 'planning_only' | 'not_connected';

export interface OrchestrationPlan {
  intent: ModelIntent;
  selectedTarget: OrchestrationTarget;
  executionMode: ExecutionMode;
  reason: string;
  safetyFlags: string[];
  intentMeta?: IntentRoutingMetadata;
}

export interface RoutingResponse {
  response: string;
  modelId: string;
  sourceModel: OrchestrationTarget;
  plan: OrchestrationPlan;
}
