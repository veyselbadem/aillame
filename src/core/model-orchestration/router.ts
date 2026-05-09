import { ModelIntent, OrchestrationPlan, OrchestrationTarget, ExecutionMode } from './types';
import { classifyIntentWithConfidence, isImageGenerationIntentText } from '../conversation/conversation-quality';

export function routeRequest(prompt: string): OrchestrationPlan {
  const p = prompt.toLowerCase();
  const intentMeta = classifyIntentWithConfidence(prompt);

  // 1. Explicit image generation request
  if (intentMeta.routeTarget === 'igm' || isImageGenerationIntentText(prompt)) {
    return {
      intent: 'image_generation',
      selectedTarget: 'sdxl',
      executionMode: 'active',
      reason: 'User requested image generation.',
      safetyFlags: [],
      intentMeta,
    };
  }

  // 2. Explicit coding request
  if (intentMeta.routeTarget === 'code') {
    return {
      intent: 'code_help',
      selectedTarget: 'qwen',
      executionMode: 'planning_only',
      reason: 'User requested programming assistance.',
      safetyFlags: [],
      intentMeta,
    };
  }

  // 3. Definition and general knowledge request
  if (intentMeta.intent === 'general_knowledge') {
    return {
      intent: 'general_knowledge',
      selectedTarget: 'nano',
      executionMode: 'active',
      reason: 'User asked a definition/general knowledge question.',
      safetyFlags: [],
      intentMeta,
    };
  }

  // 4. Agent/project operation request
  if (intentMeta.routeTarget === 'agent') {
    return {
      intent: 'agent_task',
      selectedTarget: 'code_agent',
      executionMode: 'planning_only',
      reason: 'User requested an explicit agent task.',
      safetyFlags: [],
      intentMeta,
    };
  }

  // 5. Ambiguous request
  if (intentMeta.routeTarget === 'clarification') {
    return {
      intent: 'ambiguous',
      selectedTarget: 'nano',
      executionMode: 'active',
      reason: intentMeta.fallbackReason || 'Insufficient intent signals.',
      safetyFlags: [],
      intentMeta,
    };
  }
  
  // Legacy web research intent
  if (p.includes('araştır') || p.includes('haberler') || p.includes('güncel') || p.includes('search:')) {
    return {
      intent: 'web_research',
      selectedTarget: 'web_search',
      executionMode: 'active',
      reason: 'User requested real-time information or research.',
      safetyFlags: [],
      intentMeta,
    };
  }

  // Legacy code help intent
  if (p.includes('javascript') || p.includes('python') || p.includes('kod') || p.includes('yazılım') || p.includes('hata:')) {
    return {
      intent: 'code_help',
      selectedTarget: 'qwen',
      executionMode: 'planning_only', // Qwen planned for advanced coding
      reason: 'User requested programming assistance.',
      safetyFlags: [],
      intentMeta,
    };
  }

  // Legacy simple chat intent
  if (p.length < 20 || p.includes('selam') || p.includes('nasılsın')) {
    return {
      intent: 'simple_chat',
      selectedTarget: 'nano',
      executionMode: 'active',
      reason: 'Simple greeting or short message suitable for Nano.',
      safetyFlags: [],
      intentMeta,
    };
  }

  // Default
  return {
    intent: 'text_generation',
    selectedTarget: 'nano', // Default to Nano for now, but mark as active
    executionMode: 'active',
    reason: 'Generic text request, using Nano as the primary processor.',
    safetyFlags: [],
    intentMeta,
  };
}
