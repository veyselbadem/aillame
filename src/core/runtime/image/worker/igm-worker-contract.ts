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

export const igmWorker = new NotConfiguredIGMWorker();
