/**
 * Aillame Capability Architecture - Type Definitions
 * 
 * Note: These types define the future capability-based registry.
 * Current runtime is stable and uses the basic registry.
 */

export type CapabilityId = 
  | 'nano.multimodal.core'
  | 'text.general'
  | 'code.generate'
  | 'image.generate'
  | 'vision.review'
  | 'memory.embedding'
  | 'safety.review'
  | 'document.ocr'
  | 'audio.speech'
  | 'reranker.search'
  | 'legacy.test'
  | 'archive.research';

export type ModelSlotStatus = 
  | 'installed' 
  | 'not-installed' 
  | 'placeholder' 
  | 'shared' 
  | 'active-rules' 
  | 'future' 
  | 'archived' 
  | 'unsupported' 
  | 'missing';

export type ModelSlotRole = 'primary' | 'fallback' | 'quality' | 'specialist' | 'research';

export interface AillameModelCandidate {
  modelId: string;
  priority: number; // Higher is better
  role: ModelSlotRole;
}

export interface AillameCapabilitySlot {
  id: CapabilityId;
  status: ModelSlotStatus;
  activeModelId: string | null;
  candidates: AillameModelCandidate[];
  metadata?: Record<string, any>;
}

/**
 * Registry mapping for capabilities
 */
export interface CapabilityRegistry {
  version: string;
  lastUpdated: string;
  slots: AillameCapabilitySlot[];
}
