import { ModelIntent, OrchestrationPlan, OrchestrationTarget, ExecutionMode } from './types';

export function routeRequest(prompt: string): OrchestrationPlan {
  const p = prompt.toLowerCase();
  
  // 1. Image Generation Intent
  if (p.includes('resim oluştur') || p.includes('çiz') || p.includes('görsel üret') || p.includes('image:')) {
    return {
      intent: 'image_generation',
      selectedTarget: 'sdxl',
      executionMode: 'planning_only', // SDXL not fully connected in this version
      reason: 'User requested image generation.',
      safetyFlags: []
    };
  }

  // 2. Web Research Intent
  if (p.includes('araştır') || p.includes('haberler') || p.includes('güncel') || p.includes('search:')) {
    return {
      intent: 'web_research',
      selectedTarget: 'web_search',
      executionMode: 'planning_only', // Web Search tool available but not auto-triggered in chat yet
      reason: 'User requested real-time information or research.',
      safetyFlags: []
    };
  }

  // 3. Code Help Intent
  if (p.includes('javascript') || p.includes('python') || p.includes('kod') || p.includes('yazılım') || p.includes('hata:')) {
    return {
      intent: 'code_help',
      selectedTarget: 'qwen',
      executionMode: 'planning_only', // Qwen planned for advanced coding
      reason: 'User requested programming assistance.',
      safetyFlags: []
    };
  }

  // 4. Simple Chat Intent (Handled by Nano)
  if (p.length < 20 || p.includes('selam') || p.includes('nasılsın')) {
    return {
      intent: 'simple_chat',
      selectedTarget: 'nano',
      executionMode: 'active',
      reason: 'Simple greeting or short message suitable for Nano.',
      safetyFlags: []
    };
  }

  // 5. Default: Advanced Text (Qwen/Gemini or Nano fallback)
  return {
    intent: 'text_generation',
    selectedTarget: 'nano', // Default to Nano for now, but mark as active
    executionMode: 'active',
    reason: 'Generic text request, using Nano as the primary processor.',
    safetyFlags: []
  };
}
