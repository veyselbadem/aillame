export type ModelIntent = 
  | 'simple_chat'
  | 'text_generation'
  | 'code_help'
  | 'analysis'
  | 'image_generation'
  | 'web_research'
  | 'news_analysis'
  | 'training_discussion'
  | 'unknown';

export type OrchestrationTarget = 
  | 'nano' 
  | 'qwen' 
  | 'gemini' 
  | 'sdxl' 
  | 'web_search' 
  | 'ai_lab';

export type ExecutionMode = 'active' | 'planning_only' | 'not_connected';

export interface OrchestrationPlan {
  intent: ModelIntent;
  selectedTarget: OrchestrationTarget;
  executionMode: ExecutionMode;
  reason: string;
  safetyFlags: string[];
}

export interface RoutingResponse {
  response: string;
  modelId: string;
  sourceModel: OrchestrationTarget;
  plan: OrchestrationPlan;
}
