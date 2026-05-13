import { invoke } from "@tauri-apps/api/core";

export interface SafeModelLoadResponse {
  id: string;
  displayName: string;
  rootLabel: string;
  loadStatus: string;
  runtimeLabel: string;
  memoryEstimate?: number;
  warnings: string[];
  errorCode?: string;
  canProceed: boolean;
  runtimeSessionId?: string;
}

export interface RuntimeStartOptions {
  devicePreference: string;
  startTimeoutMs: number;
  handshakeTimeoutMs: number;
  shutdownTimeoutMs: number;
}

export interface RuntimeStartRequest {
  devicePreference: string;
  options: RuntimeStartOptions;
}

export interface RuntimeStartResponse {
  success: boolean;
  sessionId?: string;
  processState: string;
  runtimeLabel: string;
  canStart: boolean;
  warnings: string[];
  errorCode?: string;
}

export interface InferenceOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  seed?: number;
}

export interface InferenceRequest {
  prompt: string;
  modelId: string;
  requestId: string;
  options: InferenceOptions;
}

export interface InferenceResponse {
  requestId: string;
  modelId: string;
  text: string;
  finishReason: string;
  tokenCount?: number;
  durationMs?: number;
  warnings: string[];
  errorCode?: string;
}

export interface RuntimeSessionState {
  sessionId: string;
  processState: string;
  activeModelId: string | null;
  pendingModelId: string | null;
  runtimeLabel: string;
  lastErrorCode: string | null;
  startedAt: number | null;
  lastHeartbeatAt: number | null;
  isInferring: boolean;
}

class TauriModelBridge {
  async listModels(): Promise<string[]> {
    return [];
  }

  async getSafeRuntimeSession(): Promise<RuntimeSessionState | null> {
    return await invoke<RuntimeSessionState | null>("get_safe_runtime_session");
  }

  async setModelDirectory(path: string): Promise<boolean> {
    return true;
  }

  async getModelMetadata(modelId: string): Promise<any> {
    return null;
  }

  async safeModelLoad(
    modelId: string, 
    confirm: boolean = false, 
    options?: RuntimeStartOptions
  ): Promise<SafeModelLoadResponse> {
    const defaultOptions: RuntimeStartOptions = {
      devicePreference: "auto",
      startTimeoutMs: 30000,
      handshakeTimeoutMs: 30000,
      shutdownTimeoutMs: 10000
    };

    return await invoke<SafeModelLoadResponse>("safe_model_load", { 
      request: { 
        modelId, 
        confirm, 
        options: options || defaultOptions,
        requestId: Math.random().toString(36).substring(7),
        prepareOnly: !confirm
      } 
    });
  }

  async safeModelUnload(): Promise<SafeModelLoadResponse> {
    return await invoke<SafeModelLoadResponse>("safe_model_unload");
  }

  async safeModelCancelLoad(): Promise<SafeModelLoadResponse> {
    return await invoke<SafeModelLoadResponse>("safe_model_cancel_load");
  }

  async safeModelInfer(
    prompt: string,
    modelId: string,
    options?: InferenceOptions
  ): Promise<InferenceResponse> {
    return await invoke<InferenceResponse>("safe_model_infer", {
      request: {
        prompt,
        modelId,
        requestId: Math.random().toString(36).substring(7),
        options: options || {}
      }
    });
  }

  async safeModelInferStream(
    prompt: string,
    modelId: string,
    options?: InferenceOptions
  ): Promise<InferenceResponse> {
    return await invoke<InferenceResponse>("safe_model_infer_stream", {
      request: {
        prompt,
        modelId,
        requestId: Math.random().toString(36).substring(7),
        options: options || {}
      }
    });
  }

  async cancelModelInferenceStream(): Promise<InferenceResponse> {
    return await invoke<InferenceResponse>("safe_model_cancel_infer_stream");
  }

  async startRuntime(options: RuntimeStartOptions): Promise<RuntimeStartResponse> {
    return await invoke<RuntimeStartResponse>("start_runtime", { 
      request: { 
        devicePreference: options.devicePreference || "auto",
        options 
      } 
    });
  }

  async stopRuntime(): Promise<string> {
    return await invoke<string>("stop_runtime");
  }
}

export const tauriModelBridge = new TauriModelBridge();
