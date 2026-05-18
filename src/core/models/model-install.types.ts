import { CapabilityId } from './capability-types';

/**
 * Model Installation & Activation Types - Phase I
 */

export interface AillameModelHardwareRequirement {
  minRamGb: number;
  minVramGb: number;
  cudaRequired: boolean;
  estimatedDiskGb: number;
}

export interface AillameModelInstallRequest {
  modelId: string;
  slot: CapabilityId;
  sourceType: 'local_file' | 'downloaded_file' | 'external_url' | 'registry_only';
  filePath: string;
  expectedArchitecture?: string;
  expectedFormat: 'gguf' | 'safetensors' | 'onnx' | 'other';
  quantization?: string;
  requiresApproval: boolean;
  notes?: string;
}

export interface AillameModelValidationResult {
  exists: boolean;
  readable: boolean;
  formatValid: boolean;
  architecture?: string;
  quantization?: string;
  sizeBytes: number;
  estimatedRamGb: number;
  estimatedVramGb: number;
  compatible: boolean;
  unsupportedReason?: string;
  warnings: string[];
  safeToActivate: boolean;
  mmprojPath?: string;
  mmprojExists?: boolean;
  multimodalReady?: boolean;
  missingRequirements?: string[];
}

export interface AillameModelActivationRequest {
  modelId: string;
  slot: CapabilityId;
  force?: boolean;
}

export interface AillameModelActivationResult {
  success: boolean;
  slot: CapabilityId;
  modelId: string;
  activeBefore: string | null;
  activeAfter: string;
  restartsRequired: boolean;
  error?: string;
}

export interface AillameModelSlotBinding {
  slot: CapabilityId;
  primaryModelId: string;
  fallbackModelId?: string;
  specialistModelId?: string;
  status: 'active' | 'pending_approval' | 'missing';
}
