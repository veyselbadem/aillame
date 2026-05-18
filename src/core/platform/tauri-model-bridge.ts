// SSR safe tauri invoke
async function getInvoke() {
  if (typeof window === 'undefined') return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke;
  } catch (err) {
    console.error('[tauri-model-bridge] Failed to import @tauri-apps/api/core', err);
    return null;
  }
}

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
    const invoke = await getInvoke();
    if (!invoke) return null;
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
    options?: RuntimeStartOptions,
    modelPath?: string
  ): Promise<SafeModelLoadResponse> {
    const defaultOptions: RuntimeStartOptions = {
      devicePreference: "auto",
      startTimeoutMs: 30000,
      handshakeTimeoutMs: 30000,
      shutdownTimeoutMs: 10000
    };

    const invoke = await getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");

    return await invoke<SafeModelLoadResponse>("safe_model_load", { 
      request: { 
        modelId, 
        modelPath: modelPath || null,
        confirm, 
        options: options || defaultOptions,
        requestId: Math.random().toString(36).substring(7),
        prepareOnly: !confirm
      } 
    });
  }

  async safeModelUnload(): Promise<SafeModelLoadResponse> {
    const invoke = await getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke<SafeModelLoadResponse>("safe_model_unload");
  }

  async safeModelCancelLoad(): Promise<SafeModelLoadResponse> {
    const invoke = await getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke<SafeModelLoadResponse>("safe_model_cancel_load");
  }

  async safeModelInfer(
    prompt: string,
    modelId: string,
    options?: InferenceOptions
  ): Promise<InferenceResponse> {
    const invoke = await getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
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
    const invoke = await getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
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
    const invoke = await getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke<InferenceResponse>("safe_model_cancel_infer_stream");
  }

  async startRuntime(options: Partial<RuntimeStartOptions> = {}): Promise<RuntimeStartResponse> {
    const isTauri = typeof window !== "undefined" && (("__TAURI__" in window) || (window as any).__TAURI_INTERNALS__);
    console.info("[tauri-model-bridge] startRuntime request", { options, tauriDetected: isTauri });

    const defaultOptions: RuntimeStartOptions = {
      devicePreference: "auto",
      startTimeoutMs: 30000,
      handshakeTimeoutMs: 30000,
      shutdownTimeoutMs: 10000
    };

    const finalOptions = { ...defaultOptions, ...options };
    const request = { 
      devicePreference: finalOptions.devicePreference,
      options: finalOptions
    };

    console.info("[tauri-model-bridge] invoking start_runtime", request);

    try {
      const invoke = await getInvoke();
      if (!invoke) throw new Error("Tauri invoke not available");
      const result = await invoke<RuntimeStartResponse>("start_runtime", { request });
      console.info("[tauri-model-bridge] start_runtime success", result);
      return result;
    } catch (err) {
      console.error("[tauri-model-bridge] start_runtime invoke failed", err);
      // Re-throw to be handled by UI
      throw err;
    }
  }

  async stopRuntime(): Promise<string> {
    const invoke = await getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke<string>("stop_runtime");
  }
}

export const tauriModelBridge = new TauriModelBridge();
