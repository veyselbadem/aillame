export interface IGMWorkerRequest {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  seed: number;
  modelId: string;
  outputDir: string;
}

export interface IGMWorkerResponse {
  success: boolean;
  jobId: string;
  assetId?: string;
  imagePath?: string;
  mimeType?: string;
  status: 'completed' | 'failed' | 'not-configured';
  error?: string;
  diagnostics?: Record<string, any>;
}

export interface IGMWorkerCapabilities {
  supportedModels: string[];
  maxResolution: { width: number; height: number };
  supportsNegativePrompt: boolean;
  supportsSeed: boolean;
}

export interface IGMWorker {
  generate(request: IGMWorkerRequest): Promise<IGMWorkerResponse>;
  getCapabilities(): Promise<IGMWorkerCapabilities>;
}

export class NotConfiguredIGMWorker implements IGMWorker {
  async generate(request: IGMWorkerRequest): Promise<IGMWorkerResponse> {
    return {
      success: false,
      jobId: 'na',
      status: 'not-configured',
      error: 'Local IGM runtime is not configured or enabled.'
    };
  }

  async getCapabilities(): Promise<IGMWorkerCapabilities> {
    return {
      supportedModels: [],
      maxResolution: { width: 0, height: 0 },
      supportsNegativePrompt: false,
      supportsSeed: false
    };
  }
}

import { IGMWorkerProcessBridge } from './igm-worker-process-bridge';

export function getIGMWorker(): IGMWorker {
  const enabled = process.env.AILLAME_IGM_RUNTIME_ENABLED === 'true';
  const command = process.env.AILLAME_IGM_WORKER_COMMAND;
  
  if (enabled && command) {
    return new IGMWorkerProcessBridge();
  }
  
  return new NotConfiguredIGMWorker();
}

export const igmWorker = getIGMWorker();
